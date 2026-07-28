-- Complete standardized scheduler retry policies and terminal dead-letter state.

alter table public.scheduler_job_definitions
  add column maximum_backoff_ms integer not null default 86400000
    check (maximum_backoff_ms between 1000 and 86400000),
  add constraint scheduler_retry_backoff_order_check
    check (maximum_backoff_ms >= backoff_ms);

alter table public.scheduler_job_executions
  drop constraint scheduler_job_executions_status_check;
alter table public.scheduler_job_executions
  add constraint scheduler_job_executions_status_check check (status in (
    'queued', 'running', 'succeeded', 'failed', 'retrying', 'timed_out',
    'skipped', 'dead_lettered'
  ));

create index scheduler_executions_status_created_idx
  on public.scheduler_job_executions (status, created_at desc);
create index scheduler_executions_trigger_created_idx
  on public.scheduler_job_executions (trigger_type, created_at desc);

update public.scheduler_job_definitions
set maximum_backoff_ms = least(86400000, greatest(backoff_ms, backoff_ms * 8));
