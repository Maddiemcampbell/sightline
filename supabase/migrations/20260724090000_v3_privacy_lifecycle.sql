-- Central privacy controls, reversible deletion requests, and retention policy.

alter table public.audit_logs
  drop constraint if exists audit_logs_organization_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete set null;

drop trigger if exists audit_logs_reject_update_delete on public.audit_logs;
create or replace function public.reject_audit_log_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
    and (new.organization_id is not distinct from old.organization_id or new.organization_id is null)
    and (new.actor_user_id is not distinct from old.actor_user_id or new.actor_user_id is null)
    and (new.organization_id is null or new.actor_user_id is null)
    and (to_jsonb(new) - array['organization_id', 'actor_user_id'])
      = (to_jsonb(old) - array['organization_id', 'actor_user_id'])
  then return new;
  end if;
  raise exception 'Audit logs are append-only' using errcode = '42501';
end;
$$;
create trigger audit_logs_reject_update_delete
before update or delete on public.audit_logs
for each row execute function public.reject_audit_log_mutation();

alter table public.organizations
  add column deletion_requested_at timestamptz,
  add column scheduled_deletion_at timestamptz,
  add column privacy_status text not null default 'active'
    check (privacy_status in ('active', 'pending_deletion', 'archived')),
  add column legal_hold_enabled boolean not null default false;

alter table public.users
  add column deletion_requested_at timestamptz,
  add column scheduled_deletion_at timestamptz;

create table public.organization_privacy_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  soft_delete_grace_days integer not null default 30 check (soft_delete_grace_days between 7 and 90),
  document_retention_days integer not null default 2555 check (document_retention_days between 30 and 3650),
  activity_retention_days integer not null default 1095 check (activity_retention_days between 90 and 3650),
  ai_retention_days integer not null default 365 check (ai_retention_days between 30 and 3650),
  audit_retention_days integer not null default 2555 check (audit_retention_days between 365 and 3650),
  deleted_record_retention_days integer not null default 30 check (deleted_record_retention_days between 7 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.privacy_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  organization_identifier_hash text,
  requested_by_auth_user_id uuid,
  requested_by_user_id uuid,
  target_auth_user_id uuid,
  target_user_id uuid,
  scope text not null check (scope in ('user_only', 'organization_only', 'organization_all_data')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'completed', 'cancelled', 'failed')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  processing_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failure_code text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_for > requested_at),
  check (organization_id is not null or target_auth_user_id is not null)
);

create unique index privacy_deletion_requests_active_org_idx
  on public.privacy_deletion_requests (organization_id)
  where status in ('scheduled', 'processing') and organization_id is not null;
create unique index privacy_deletion_requests_active_user_idx
  on public.privacy_deletion_requests (target_auth_user_id)
  where status in ('scheduled', 'processing') and target_auth_user_id is not null;
create index privacy_deletion_requests_due_idx
  on public.privacy_deletion_requests (scheduled_for, id)
  where status = 'scheduled';

create trigger organization_privacy_settings_set_updated_at
  before update on public.organization_privacy_settings
  for each row execute function public.set_updated_at();
create trigger privacy_deletion_requests_set_updated_at
  before update on public.privacy_deletion_requests
  for each row execute function public.set_updated_at();

insert into public.organization_privacy_settings (organization_id)
select id from public.organizations on conflict do nothing;

create or replace function public.create_organization_privacy_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_privacy_settings (organization_id) values (new.id);
  return new;
end;
$$;
create trigger organizations_create_privacy_settings
  after insert on public.organizations
  for each row execute function public.create_organization_privacy_settings();

create or replace function public.claim_due_privacy_requests(batch_size integer default 20)
returns setof public.privacy_deletion_requests
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with claimed as (
    select request.id
    from public.privacy_deletion_requests request
    where (
      request.status = 'scheduled'
      or (
        request.status = 'failed'
        and request.attempt_count < 5
        and request.last_attempt_at < now() - interval '15 minutes'
      )
      or (
        request.status = 'processing'
        and request.attempt_count < 5
        and request.processing_started_at < now() - interval '1 hour'
      )
    )
      and request.scheduled_for <= now()
    order by request.scheduled_for, request.id
    for update skip locked
    limit greatest(1, least(batch_size, 100))
  )
  update public.privacy_deletion_requests request
  set status = 'processing',
      processing_started_at = now(),
      last_attempt_at = now(),
      attempt_count = request.attempt_count + 1,
      failure_code = null
  from claimed
  where request.id = claimed.id
  returning request.*;
end;
$$;
revoke all on function public.claim_due_privacy_requests(integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_privacy_requests(integer) to service_role;

create or replace function public.prevent_risk_activity_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.privacy_cleanup', true) = 'on' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  raise exception 'Risk activity is append-only; create a correcting activity instead.';
end;
$$;

create or replace function public.purge_expired_organization_data(target_organization_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  settings public.organization_privacy_settings;
  activity_count integer := 0;
  ai_count integer := 0;
  comment_count integer := 0;
begin
  select * into settings from public.organization_privacy_settings
  where organization_id = target_organization_id;
  if settings.organization_id is null then return '{}'::jsonb; end if;
  if exists (
    select 1 from public.organizations
    where id = target_organization_id and legal_hold_enabled
  ) then return jsonb_build_object('legalHold', true); end if;

  perform set_config('app.privacy_cleanup', 'on', true);
  delete from public.risk_activities
  where organization_id = target_organization_id
    and occurred_at < now() - make_interval(days => settings.activity_retention_days);
  get diagnostics activity_count = row_count;

  delete from public.risk_conversations
  where organization_id = target_organization_id
    and updated_at < now() - make_interval(days => settings.ai_retention_days);
  get diagnostics ai_count = row_count;

  delete from public.collaboration_comments
  where organization_id = target_organization_id
    and deleted_at is not null
    and deleted_at < now() - make_interval(days => settings.deleted_record_retention_days);
  get diagnostics comment_count = row_count;

  return jsonb_build_object(
    'activities', activity_count,
    'aiConversations', ai_count,
    'deletedComments', comment_count
  );
end;
$$;
revoke all on function public.purge_expired_organization_data(uuid)
  from public, anon, authenticated;
grant execute on function public.purge_expired_organization_data(uuid) to service_role;

alter table public.organization_privacy_settings enable row level security;
alter table public.privacy_deletion_requests enable row level security;

create policy organization_privacy_settings_member_select
  on public.organization_privacy_settings for select to authenticated
  using ((select public.is_organization_member(organization_id)));
create policy privacy_deletion_requests_requester_select
  on public.privacy_deletion_requests for select to authenticated
  using (
    requested_by_auth_user_id = (select auth.uid())
    or (
      organization_id is not null
      and (select public.current_organization_role(organization_id)) = 'owner'
    )
  );

grant select on public.organization_privacy_settings,
  public.privacy_deletion_requests to authenticated;
grant all on public.organization_privacy_settings,
  public.privacy_deletion_requests to service_role;

comment on table public.privacy_deletion_requests is
  'Idempotent privacy workflow ledger retained after tenant or account deletion.';
comment on column public.organizations.legal_hold_enabled is
  'Placeholder only; enabling or releasing legal hold requires a future controlled workflow.';
