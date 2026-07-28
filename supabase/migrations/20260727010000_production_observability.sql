-- Centralized, redacted production error reporting and platform job alerts.

create table public.application_error_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('client', 'server', 'api', 'background_job')),
  severity text not null default 'error' check (severity in ('warning', 'error', 'fatal')),
  environment text not null,
  application_version text not null,
  error_name text not null,
  error_message text not null,
  stack_trace text,
  request_path text,
  request_method text,
  request_id uuid not null,
  correlation_id uuid not null,
  auth_user_id uuid,
  application_user_id uuid,
  organization_id uuid,
  user_agent text,
  browser_context jsonb not null default '{}'::jsonb,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (application_user_id, organization_id)
    references public.users(id, organization_id) on delete set null
);

create index application_error_reports_occurred_idx
  on public.application_error_reports (occurred_at desc, id desc);
create index application_error_reports_correlation_idx
  on public.application_error_reports (correlation_id);
create index application_error_reports_source_environment_idx
  on public.application_error_reports (environment, source, occurred_at desc);
create index application_error_reports_organization_idx
  on public.application_error_reports (organization_id, occurred_at desc)
  where organization_id is not null;

create table public.job_monitoring_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_run_id uuid,
  job_type text not null check (job_type in (
    'portfolio_refresh', 'daily_executive_brief'
  )),
  alert_type text not null check (alert_type in (
    'execution_failed', 'repeated_failures', 'long_running'
  )),
  severity text not null check (severity in ('warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'recovered')),
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_detected_at timestamptz not null,
  last_detected_at timestamptz not null,
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (job_run_id, organization_id)
    references public.organization_job_runs(id, organization_id) on delete set null
);

create unique index job_monitoring_alerts_open_unique_idx
  on public.job_monitoring_alerts (organization_id, job_type, alert_type)
  where status = 'open';
create index job_monitoring_alerts_history_idx
  on public.job_monitoring_alerts (status, last_detected_at desc, id desc);
create index job_monitoring_alerts_organization_idx
  on public.job_monitoring_alerts (organization_id, job_type, last_detected_at desc);

create trigger job_monitoring_alerts_set_updated_at
before update on public.job_monitoring_alerts
for each row execute function public.set_updated_at();

create table public.job_monitoring_alert_events (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.job_monitoring_alerts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null check (event_type in (
    'opened', 'repeated', 'recovered', 'channel_dispatched', 'channel_failed'
  )),
  channel text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index job_monitoring_alert_events_alert_idx
  on public.job_monitoring_alert_events (alert_id, occurred_at desc, id desc);
create index job_monitoring_alert_events_history_idx
  on public.job_monitoring_alert_events (occurred_at desc, id desc);

alter table public.application_error_reports enable row level security;
alter table public.job_monitoring_alerts enable row level security;
alter table public.job_monitoring_alert_events enable row level security;

-- These are operational records. Customer roles receive no grants; internal
-- platform services use the service role after explicit permission checks.
grant all on public.application_error_reports, public.job_monitoring_alerts,
  public.job_monitoring_alert_events to service_role;

comment on table public.application_error_reports is
  'Redacted application failures for internal production operations; never stores request bodies or raw customer content.';
comment on table public.job_monitoring_alerts is
  'Centralized, deduplicated health alerts derived from durable organization job runs.';
comment on table public.job_monitoring_alert_events is
  'Append-only dispatch and lifecycle history for job monitoring alerts.';
