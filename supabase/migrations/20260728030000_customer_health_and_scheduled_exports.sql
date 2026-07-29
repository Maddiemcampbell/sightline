-- Complete customer-health visibility and organization-configurable recurring
-- data exports without exposing customer content to platform operators.

create view public.platform_customer_health
with (security_invoker = false)
as
with login_metrics as (
  select
    membership.organization_id,
    max(auth_user.last_sign_in_at) as last_login_at
  from public.organization_memberships membership
  join auth.users auth_user on auth_user.id = membership.auth_user_id
  group by membership.organization_id
),
activity_metrics as (
  select
    membership.organization_id,
    max(membership.last_active_at) as last_activity_at
  from public.organization_memberships membership
  group by membership.organization_id
),
job_metrics as (
  select
    run.organization_id,
    count(*) filter (
      where run.status = 'failed'
        and run.created_at >= now() - interval '30 days'
    )::integer as job_failures_30d,
    max(run.completed_at) filter (where run.status = 'failed') as last_job_failure_at
  from public.organization_job_runs run
  group by run.organization_id
),
export_job_metrics as (
  select
    export.organization_id,
    count(*) filter (
      where export.status = 'failed'
        and export.requested_at >= now() - interval '30 days'
    )::integer as export_failures_30d,
    max(export.completed_at) filter (where export.status = 'failed')
      as last_export_failure_at
  from public.organization_data_exports export
  group by export.organization_id
),
activity_counts as (
  select
    log.organization_id,
    count(*) filter (
      where log.occurred_at >= now() - interval '30 days'
    )::integer as activity_events_30d
  from public.audit_logs log
  where log.organization_id is not null
  group by log.organization_id
),
feature_metrics as (
  select
    organization.id as organization_id,
    (case when exists (
      select 1 from public.projects item where item.organization_id = organization.id
    ) then 1 else 0 end
    + case when exists (
      select 1 from public.vendors item where item.organization_id = organization.id
    ) then 1 else 0 end
    + case when exists (
      select 1 from public.documents item where item.organization_id = organization.id
    ) then 1 else 0 end
    + case when exists (
      select 1 from public.risks item where item.organization_id = organization.id
    ) then 1 else 0 end
    + case when exists (
      select 1 from public.recommended_actions item
      where item.organization_id = organization.id
        and item.status in ('accepted', 'in_progress', 'completed')
    ) then 1 else 0 end
    + case when exists (
      select 1 from public.risk_conversations item
      where item.organization_id = organization.id
    ) then 1 else 0 end
    + case when exists (
      select 1 from public.daily_briefs item where item.organization_id = organization.id
    ) then 1 else 0 end)::integer as adopted_feature_count,
    (case when exists (
      select 1 from public.projects item where item.organization_id = organization.id
    ) then 20 else 0 end
    + case when exists (
      select 1 from public.vendors item where item.organization_id = organization.id
    ) then 20 else 0 end
    + case when exists (
      select 1 from public.documents item where item.organization_id = organization.id
    ) then 20 else 0 end
    + case when exists (
      select 1 from public.risks item where item.organization_id = organization.id
    ) then 20 else 0 end
    + case when exists (
      select 1 from public.daily_briefs item where item.organization_id = organization.id
    ) then 20 else 0 end)::integer as onboarding_completion_percent
  from public.organizations organization
)
select
  organization.id,
  organization.name,
  organization.slug,
  organization.privacy_status as account_status,
  organization.created_at,
  login.last_login_at,
  activity.last_activity_at,
  (coalesce(job.job_failures_30d, 0)
    + coalesce(export_job.export_failures_30d, 0))::integer as job_failures_30d,
  greatest(job.last_job_failure_at, export_job.last_export_failure_at)
    as last_job_failure_at,
  coalesce(activity_count.activity_events_30d, 0)::integer as activity_events_30d,
  feature.onboarding_completion_percent,
  feature.adopted_feature_count,
  7::integer as available_feature_count,
  round(feature.adopted_feature_count::numeric / 7 * 100)::integer
    as feature_adoption_percent,
  case
    when coalesce(job.job_failures_30d, 0)
      + coalesce(export_job.export_failures_30d, 0) > 0 then 0
    when login.last_login_at is null
      or login.last_login_at < now() - interval '30 days' then 0
    when feature.onboarding_completion_percent < 80
      or feature.adopted_feature_count < 4 then 1
    else 2
  end as health_rank,
  case
    when coalesce(job.job_failures_30d, 0)
      + coalesce(export_job.export_failures_30d, 0) > 0 then 'needs_attention'
    when login.last_login_at is null
      or login.last_login_at < now() - interval '30 days' then 'needs_attention'
    when feature.onboarding_completion_percent < 80
      or feature.adopted_feature_count < 4 then 'watch'
    else 'healthy'
  end as health_status
from public.organizations organization
join feature_metrics feature on feature.organization_id = organization.id
left join login_metrics login on login.organization_id = organization.id
left join activity_metrics activity on activity.organization_id = organization.id
left join job_metrics job on job.organization_id = organization.id
left join export_job_metrics export_job
  on export_job.organization_id = organization.id
left join activity_counts activity_count
  on activity_count.organization_id = organization.id;

revoke all on table public.platform_customer_health from public, anon, authenticated;
grant select on table public.platform_customer_health to service_role;

comment on view public.platform_customer_health is
  'Content-free operational health aggregate for authorized platform operators.';

create table public.organization_data_export_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  export_format text not null default 'zip' check (export_format in ('csv', 'json', 'zip')),
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly', 'monthly')),
  local_time time not null default '06:00',
  weekday smallint not null default 1 check (weekday between 0 and 6),
  day_of_month smallint not null default 1 check (day_of_month between 1 and 28),
  timezone text not null default 'America/Los_Angeles',
  configured_by_membership_id uuid,
  configured_by_auth_user_id uuid references auth.users(id) on delete set null,
  configured_by_name text not null check (char_length(configured_by_name) between 1 and 160),
  configured_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (configured_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id)
    on delete set null (configured_by_membership_id)
);

alter table public.organization_data_exports
  add column schedule_id uuid,
  add column schedule_occurrence_key text,
  add column next_retry_at timestamptz,
  add foreign key (schedule_id, organization_id)
    references public.organization_data_export_schedules(id, organization_id)
    on delete set null (schedule_id);

alter table public.organization_data_exports
  drop constraint organization_data_exports_status_check;
alter table public.organization_data_exports
  add constraint organization_data_exports_status_check check (
    status in ('queued', 'processing', 'retrying', 'ready', 'failed', 'expired')
  );
alter table public.organization_data_exports
  add constraint organization_data_exports_schedule_occurrence_check check (
    (schedule_id is null and schedule_occurrence_key is null)
    or (schedule_id is not null and schedule_occurrence_key is not null)
  );

alter table public.organization_data_exports
  add constraint organization_data_exports_schedule_occurrence_unique
  unique (schedule_id, schedule_occurrence_key);
create index organization_data_exports_retry_idx
  on public.organization_data_exports (next_retry_at)
  where status = 'retrying';

create trigger organization_data_export_schedules_set_updated_at
  before update on public.organization_data_export_schedules
  for each row execute function public.set_updated_at();

alter table public.organization_data_export_schedules enable row level security;
revoke all on table public.organization_data_export_schedules from anon, authenticated;
grant select on table public.organization_data_export_schedules to authenticated;
grant all on table public.organization_data_export_schedules to service_role;

create policy organization_data_export_schedules_admin_select
  on public.organization_data_export_schedules for select to authenticated
  using (exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = organization_data_export_schedules.organization_id
      and membership.auth_user_id = (select auth.uid())
      and membership.role in ('owner', 'administrator')
  ));

create or replace function public.claim_organization_data_exports(batch_size integer default 5)
returns setof public.organization_data_exports
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;
  return query
  with candidates as (
    select export.id
    from public.organization_data_exports export
    where (
      export.status = 'queued'
      or (
        export.status = 'retrying'
        and export.next_retry_at <= now()
      )
      or (
        export.status = 'processing'
        and export.processing_started_at < now() - interval '1 hour'
      )
    )
      and export.attempt_count < 5
    order by coalesce(export.next_retry_at, export.requested_at)
    for update skip locked
    limit greatest(1, least(batch_size, 20))
  )
  update public.organization_data_exports export
  set
    status = 'processing',
    processing_started_at = now(),
    attempt_count = export.attempt_count + 1,
    failure_code = null,
    next_retry_at = null
  from candidates
  where export.id = candidates.id
  returning export.*;
end;
$$;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (notification_type in (
    'mention', 'assignment', 'role_change', 'invitation', 'project_added',
    'risk_assigned', 'action_completed', 'data_export_ready',
    'background_job_failed', 'data_export_failed'
  ));

comment on table public.organization_data_export_schedules is
  'Organization-local recurring data export configuration. External cron invokes the central scheduler.';
