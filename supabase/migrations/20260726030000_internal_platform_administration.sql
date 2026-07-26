-- Standalone Sightline staff identities and capability grants. Platform
-- operators are intentionally separate from customer organization membership.

create table public.platform_operators (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  email text not null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'suspended')),
  mfa_required boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_operator_permissions (
  operator_id uuid not null references public.platform_operators(id) on delete cascade,
  permission text not null check (permission in (
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
    'platform.admin.manage'
  )),
  granted_by_operator_id uuid references public.platform_operators(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (operator_id, permission)
);

create table public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.platform_operators(id) on delete restrict,
  action text not null check (char_length(action) between 1 and 160),
  resource_type text not null check (char_length(resource_type) between 1 and 120),
  resource_id text,
  organization_id uuid references public.organizations(id) on delete set null,
  affected_auth_user_id uuid,
  ip_address inet,
  user_agent text,
  request_id text not null,
  outcome text not null default 'success' check (outcome in ('success', 'denied', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index platform_audit_logs_time_idx
  on public.platform_audit_logs (occurred_at desc);
create index platform_audit_logs_operator_idx
  on public.platform_audit_logs (operator_id, occurred_at desc);
create index platform_audit_logs_organization_idx
  on public.platform_audit_logs (organization_id, occurred_at desc)
  where organization_id is not null;

create trigger platform_operators_set_updated_at
before update on public.platform_operators
for each row execute function public.set_updated_at();

create or replace function public.reject_platform_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Platform audit records are append-only';
end;
$$;

create trigger platform_audit_logs_reject_update_delete
before update or delete on public.platform_audit_logs
for each row execute function public.reject_platform_audit_mutation();

create or replace function public.enforce_platform_operator_separation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'platform_operators' then
    if exists (
      select 1 from public.organization_memberships membership
      where membership.auth_user_id = new.auth_user_id
    ) then
      raise exception 'Platform operators cannot be organization members';
    end if;
  else
    if exists (
      select 1 from public.platform_operators operator
      where operator.auth_user_id = new.auth_user_id
    ) then
      raise exception 'Platform operators cannot be organization members';
    end if;
  end if;
  return new;
end;
$$;

create trigger platform_operators_separation_guard
before insert or update of auth_user_id on public.platform_operators
for each row execute function public.enforce_platform_operator_separation();
create trigger organization_memberships_platform_separation_guard
before insert or update of auth_user_id on public.organization_memberships
for each row execute function public.enforce_platform_operator_separation();

alter table public.platform_operators enable row level security;
alter table public.platform_operator_permissions enable row level security;
alter table public.platform_audit_logs enable row level security;

create policy platform_operators_self_select
  on public.platform_operators for select to authenticated
  using (auth_user_id = (select auth.uid()));
create policy platform_operator_permissions_self_select
  on public.platform_operator_permissions for select to authenticated
  using (exists (
    select 1 from public.platform_operators operator
    where operator.id = platform_operator_permissions.operator_id
      and operator.auth_user_id = (select auth.uid())
      and operator.status = 'active'
  ));

grant select on public.platform_operators, public.platform_operator_permissions
  to authenticated;
grant all on public.platform_operators, public.platform_operator_permissions,
  public.platform_audit_logs to service_role;

comment on table public.platform_operators is
  'Sightline employee identities. These identities may not hold customer organization memberships.';
comment on table public.platform_operator_permissions is
  'Individually assigned platform capabilities; no super-admin boolean exists.';
comment on table public.platform_audit_logs is
  'Append-only staff access and operations ledger, separate from customer audit logs.';
