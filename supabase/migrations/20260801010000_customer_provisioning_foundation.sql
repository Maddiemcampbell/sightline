-- Invite-only customer acquisition and provider-neutral billing foundation.
-- No customer resources are created until billing is approved and the
-- designated owner completes the activation invitation.

alter table public.platform_operator_permissions
  drop constraint if exists platform_operator_permissions_permission_check;
alter table public.platform_operator_permissions
  add constraint platform_operator_permissions_permission_check
  check (permission in (
    'platform.dashboard.read',
    'platform.organizations.read',
    'platform.users.read',
    'platform.audit.read',
    'platform.jobs.read',
    'platform.jobs.retry',
    'platform.ai.read',
    'platform.health.read',
    'platform.support.read',
    'platform.support.write',
    'platform.flags.manage',
    'platform.releases.read',
    'platform.admin.manage',
    'platform.provisioning.manage'
  ));

create table public.customer_access_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(trim(company_name)) between 2 and 160),
  requested_slug text check (
    requested_slug is null or requested_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  owner_name text not null check (char_length(trim(owner_name)) between 2 and 120),
  owner_email text not null check (owner_email = lower(trim(owner_email))),
  company_size text,
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'submitted' check (status in (
    'submitted', 'payment_pending', 'ready_for_owner', 'provisioning',
    'provisioned', 'rejected', 'cancelled', 'failed'
  )),
  organization_id uuid unique references public.organizations(id) on delete set null,
  activation_token_hash text unique check (
    activation_token_hash is null or char_length(activation_token_hash) = 64
  ),
  activation_expires_at timestamptz,
  activation_consumed_at timestamptz,
  reviewed_by_operator_id uuid references public.platform_operators(id) on delete set null,
  reviewed_at timestamptz,
  correlation_id uuid not null default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (activation_token_hash is null and activation_expires_at is null)
    or (activation_token_hash is not null and activation_expires_at is not null)
  )
);

create unique index customer_access_requests_active_company_owner_idx
  on public.customer_access_requests (lower(company_name), owner_email)
  where status in (
    'submitted', 'payment_pending', 'ready_for_owner', 'provisioning', 'provisioned'
  );
create unique index customer_access_requests_active_slug_idx
  on public.customer_access_requests (requested_slug)
  where requested_slug is not null
    and status in ('payment_pending', 'ready_for_owner', 'provisioning', 'provisioned');
create index customer_access_requests_queue_idx
  on public.customer_access_requests (status, requested_at desc);
create index customer_access_requests_activation_idx
  on public.customer_access_requests (activation_token_hash)
  where activation_consumed_at is null;

create table public.organization_billing_accounts (
  id uuid primary key default gen_random_uuid(),
  access_request_id uuid not null unique
    references public.customer_access_requests(id) on delete restrict,
  organization_id uuid unique references public.organizations(id) on delete set null,
  provider text not null check (provider in ('mock', 'stripe')),
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'pending' check (status in (
    'pending', 'active', 'past_due', 'cancelled', 'payment_failed'
  )),
  plan_key text not null default 'design_partner',
  billing_email text not null check (billing_email = lower(trim(billing_email))),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organization_billing_accounts_status_idx
  on public.organization_billing_accounts (status, updated_at desc);

create table public.billing_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('mock', 'stripe')),
  provider_event_id text not null,
  access_request_id uuid references public.customer_access_requests(id) on delete set null,
  event_type text not null check (char_length(event_type) between 1 and 120),
  processing_status text not null default 'processed' check (
    processing_status in ('received', 'processed', 'failed', 'ignored')
  ),
  safe_metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);
create index billing_provider_events_request_time_idx
  on public.billing_provider_events (access_request_id, occurred_at desc);

create table public.customer_provisioning_attempts (
  id uuid primary key default gen_random_uuid(),
  access_request_id uuid not null
    references public.customer_access_requests(id) on delete restrict,
  trigger_source text not null check (trigger_source in ('owner_activation', 'retry')),
  status text not null check (status in ('started', 'succeeded', 'failed')),
  failure_code text,
  correlation_id uuid not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index customer_provisioning_attempts_history_idx
  on public.customer_provisioning_attempts (access_request_id, started_at desc);

create trigger customer_access_requests_set_updated_at
before update on public.customer_access_requests
for each row execute function public.set_updated_at();
create trigger organization_billing_accounts_set_updated_at
before update on public.organization_billing_accounts
for each row execute function public.set_updated_at();

alter table public.customer_access_requests enable row level security;
alter table public.organization_billing_accounts enable row level security;
alter table public.billing_provider_events enable row level security;
alter table public.customer_provisioning_attempts enable row level security;

revoke all on table public.customer_access_requests,
  public.organization_billing_accounts,
  public.billing_provider_events,
  public.customer_provisioning_attempts
from public, anon, authenticated;
grant all on table public.customer_access_requests,
  public.organization_billing_accounts,
  public.billing_provider_events,
  public.customer_provisioning_attempts
to service_role;

create or replace function public.complete_customer_owner_activation(
  supplied_activation_token_hash text,
  principal_auth_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_request public.customer_access_requests;
  selected_auth_email text;
  new_organization_id uuid;
  new_application_user_id uuid;
begin
  select * into selected_request
  from public.customer_access_requests request
  where request.activation_token_hash = supplied_activation_token_hash
  for update;

  if selected_request.id is null
    or selected_request.status not in ('ready_for_owner', 'provisioning')
    or selected_request.requested_slug is null
    or selected_request.activation_consumed_at is not null
    or selected_request.activation_expires_at <= now()
    or not exists (
      select 1 from public.organization_billing_accounts billing
      where billing.access_request_id = selected_request.id
        and billing.status = 'active'
    )
  then
    raise exception 'Activation is invalid or unavailable';
  end if;

  select lower(auth_user.email) into selected_auth_email
  from auth.users auth_user
  where auth_user.id = principal_auth_user_id;
  if selected_auth_email is null or selected_auth_email <> selected_request.owner_email then
    raise exception 'Activation identity does not match';
  end if;

  if selected_request.organization_id is not null then
    return selected_request.organization_id;
  end if;

  update public.customer_access_requests
  set status = 'provisioning'
  where id = selected_request.id;

  insert into public.organizations (name, slug, created_by_auth_user_id)
  values (
    selected_request.company_name,
    selected_request.requested_slug,
    principal_auth_user_id
  )
  returning id into new_organization_id;

  insert into public.users (
    organization_id, auth_user_id, email, full_name, role
  ) values (
    new_organization_id,
    principal_auth_user_id,
    selected_request.owner_email,
    selected_request.owner_name,
    'admin'
  ) returning id into new_application_user_id;

  insert into public.organization_memberships (
    organization_id, auth_user_id, application_user_id, role
  ) values (
    new_organization_id,
    principal_auth_user_id,
    new_application_user_id,
    'owner'
  );

  update public.organization_billing_accounts
  set organization_id = new_organization_id
  where access_request_id = selected_request.id;
  update public.customer_access_requests
  set organization_id = new_organization_id,
      status = 'provisioned',
      activation_consumed_at = now()
  where id = selected_request.id;

  return new_organization_id;
end;
$$;

revoke all on function public.complete_customer_owner_activation(text, uuid) from public;
grant execute on function public.complete_customer_owner_activation(text, uuid)
  to service_role;

comment on table public.customer_access_requests is
  'Pre-tenant sales-assisted access requests; creating one does not create Auth or customer resources.';
comment on table public.organization_billing_accounts is
  'Provider-neutral recurring billing eligibility; never stores payment credentials.';
comment on table public.billing_provider_events is
  'Idempotent sanitized billing event ledger; raw provider payloads and credentials are excluded.';
