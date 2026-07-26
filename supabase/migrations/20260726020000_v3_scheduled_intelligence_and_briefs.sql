-- Durable, organization-scoped scheduling and execution history for portfolio
-- intelligence and Daily Executive Briefs. An external scheduler invokes the
-- authenticated cron routes; these records provide idempotency and retries.

create table public.organization_job_schedules (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  timezone text not null default 'America/Los_Angeles',
  portfolio_refresh_enabled boolean not null default true,
  portfolio_refresh_time time not null default '02:00',
  daily_brief_enabled boolean not null default true,
  daily_brief_time time not null default '07:00',
  max_attempts smallint not null default 3 check (max_attempts between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_job_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_type text not null check (job_type in (
    'portfolio_refresh', 'daily_executive_brief'
  )),
  trigger_source text not null check (trigger_source in (
    'scheduled', 'manual', 'retry'
  )),
  status text not null default 'queued' check (status in (
    'queued', 'running', 'succeeded', 'failed'
  )),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 240),
  requested_by_membership_id uuid,
  attempt_count smallint not null default 0 check (attempt_count >= 0),
  max_attempts smallint not null default 3 check (max_attempts between 1 and 10),
  scheduled_for timestamptz,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  metrics jsonb not null default '{}'::jsonb,
  error_message text,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, job_type, idempotency_key),
  unique (id, organization_id),
  foreign key (requested_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete set null
);

create index organization_job_runs_history_idx
  on public.organization_job_runs (organization_id, job_type, created_at desc);
create index organization_job_runs_retry_idx
  on public.organization_job_runs (job_type, next_retry_at)
  where status = 'failed' and next_retry_at is not null;

create trigger organization_job_schedules_set_updated_at
before update on public.organization_job_schedules
for each row execute function public.set_updated_at();
create trigger organization_job_runs_set_updated_at
before update on public.organization_job_runs
for each row execute function public.set_updated_at();

insert into public.organization_job_schedules (organization_id, timezone)
select id, timezone from public.organizations
on conflict (organization_id) do nothing;

create or replace function public.create_default_organization_job_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_job_schedules (organization_id, timezone)
  values (new.id, new.timezone)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger organizations_create_default_job_schedule
after insert on public.organizations
for each row execute function public.create_default_organization_job_schedule();

alter table public.organization_job_schedules enable row level security;
alter table public.organization_job_runs enable row level security;

create policy organization_job_schedules_admin_select
  on public.organization_job_schedules for select to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_job_schedules.organization_id
      and membership.auth_user_id = (select auth.uid())
      and membership.role in ('owner', 'administrator')
  ));

create policy organization_job_runs_admin_select
  on public.organization_job_runs for select to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_job_runs.organization_id
      and membership.auth_user_id = (select auth.uid())
      and membership.role in ('owner', 'administrator')
  ));

grant select on public.organization_job_schedules, public.organization_job_runs
  to authenticated;
grant all on public.organization_job_schedules, public.organization_job_runs
  to service_role;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (notification_type in (
    'mention', 'assignment', 'role_change', 'invitation', 'project_added',
    'risk_assigned', 'action_completed', 'data_export_ready',
    'background_job_failed'
  ));

comment on table public.organization_job_schedules is
  'Organization-local recurring schedule configuration; execution is triggered by authenticated cron routes.';
comment on table public.organization_job_runs is
  'Durable execution, retry, performance, and failure history for organization-scoped jobs.';
