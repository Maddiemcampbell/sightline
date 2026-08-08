-- Allow Procore synchronization to use the existing durable organization job queue.

alter table public.organization_job_runs drop constraint organization_job_runs_job_type_check;
alter table public.organization_job_runs add constraint organization_job_runs_job_type_check
  check (job_type in ('portfolio_refresh', 'daily_executive_brief', 'procore_sync'));

alter table public.job_monitoring_alerts drop constraint job_monitoring_alerts_job_type_check;
alter table public.job_monitoring_alerts add constraint job_monitoring_alerts_job_type_check
  check (job_type in ('portfolio_refresh', 'daily_executive_brief', 'procore_sync'));

create index organization_job_runs_procore_queue_idx
  on public.organization_job_runs (job_type, status, created_at)
  where job_type = 'procore_sync';

insert into public.scheduler_job_definitions
  (job_key, display_name, description, cron_schedule, timeout_ms, max_retries, backoff_ms)
values
  ('procore-sync', 'Procore synchronization', 'Process queued Procore project and financial synchronization work.', '*/5 * * * *', 1200000, 2, 300000)
on conflict (job_key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  cron_schedule = excluded.cron_schedule,
  timeout_ms = excluded.timeout_ms,
  max_retries = excluded.max_retries,
  backoff_ms = excluded.backoff_ms;
