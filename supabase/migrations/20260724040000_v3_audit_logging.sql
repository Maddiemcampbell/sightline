-- Authentication can occur before a user has an organization. Such records
-- retain the auth user when known and have a null organization/application
-- user until a tenant exists.
alter table public.audit_logs
  alter column organization_id drop not null,
  add column ip_address inet,
  add column correlation_id uuid not null default gen_random_uuid();

create index audit_logs_correlation_idx
  on public.audit_logs (correlation_id);
create index audit_logs_actor_auth_occurred_idx
  on public.audit_logs (actor_auth_user_id, occurred_at desc)
  where actor_auth_user_id is not null;

create or replace function public.reject_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit logs are append-only'
    using errcode = '42501';
end;
$$;

revoke all on function public.reject_audit_log_mutation() from public;

create trigger audit_logs_reject_update_delete
before update or delete on public.audit_logs
for each statement execute function public.reject_audit_log_mutation();

revoke update, delete, truncate on public.audit_logs
  from authenticated, service_role;
grant select, insert on public.audit_logs to service_role;

comment on table public.audit_logs is
  'Append-only internal security audit ledger; distinct from user-facing activity.';
comment on column public.audit_logs.correlation_id is
  'Request/workflow UUID used to correlate audit records without storing secrets.';
