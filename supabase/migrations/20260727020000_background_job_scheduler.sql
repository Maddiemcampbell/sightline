-- Central job definitions, durable execution history, and database-backed
-- leases. Existing organization-specific schedule values are not modified.

create table public.scheduler_job_definitions (
  job_key text primary key check (job_key ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  display_name text not null,
  description text not null default '',
  cron_schedule text not null,
  enabled boolean not null default true,
  timeout_ms integer not null check (timeout_ms between 1000 and 3600000),
  max_retries smallint not null default 0 check (max_retries between 0 and 10),
  backoff_ms integer not null default 60000 check (backoff_ms between 1000 and 86400000),
  concurrency_policy text not null default 'forbid' check (concurrency_policy = 'forbid'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scheduler_job_executions (
  id uuid primary key default gen_random_uuid(),
  job_key text not null references public.scheduler_job_definitions(job_key),
  trigger_type text not null check (trigger_type in ('scheduled', 'manual', 'retry')),
  status text not null default 'queued' check (status in (
    'queued', 'running', 'succeeded', 'failed', 'retrying', 'timed_out', 'skipped'
  )),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  attempt_number smallint not null default 1 check (attempt_number between 1 and 11),
  parent_execution_id uuid references public.scheduler_job_executions(id),
  root_execution_id uuid references public.scheduler_job_executions(id),
  next_retry_at timestamptz,
  correlation_id uuid not null default gen_random_uuid(),
  safe_error_code text,
  safe_error_summary text,
  initiating_operator_id uuid references public.platform_operators(id) on delete set null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scheduler_job_locks (
  job_key text primary key references public.scheduler_job_definitions(job_key) on delete cascade,
  lease_token uuid not null,
  acquired_at timestamptz not null,
  lease_expires_at timestamptz not null,
  execution_id uuid not null references public.scheduler_job_executions(id) on delete cascade
);

create index scheduler_executions_history_idx
  on public.scheduler_job_executions (job_key, created_at desc);
create index scheduler_executions_retry_idx
  on public.scheduler_job_executions (next_retry_at)
  where status = 'retrying';
create index scheduler_executions_correlation_idx
  on public.scheduler_job_executions (correlation_id);
create unique index scheduler_executions_scheduled_unique_idx
  on public.scheduler_job_executions (job_key, scheduled_for)
  where trigger_type = 'scheduled';
create index scheduler_locks_expiry_idx
  on public.scheduler_job_locks (lease_expires_at);

create trigger scheduler_job_definitions_set_updated_at before update
  on public.scheduler_job_definitions for each row execute function public.set_updated_at();
create trigger scheduler_job_executions_set_updated_at before update
  on public.scheduler_job_executions for each row execute function public.set_updated_at();

create or replace function public.acquire_scheduler_job_lock(
  requested_job_key text,
  requested_execution_id uuid,
  requested_lease_token uuid,
  requested_now timestamptz,
  requested_lease_expires_at timestamptz
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.scheduler_job_executions execution
  set status = 'timed_out',
      completed_at = requested_now,
      duration_ms = greatest(
        0,
        floor(extract(epoch from (requested_now - execution.started_at)) * 1000)
      )::integer,
      safe_error_code = 'stale_lease_recovered',
      safe_error_summary =
        'The previous application instance stopped before releasing its lease.'
  where execution.id = (
    select existing.execution_id
    from public.scheduler_job_locks existing
    where existing.job_key = requested_job_key
      and existing.lease_expires_at <= requested_now
  ) and execution.status = 'running';

  insert into public.scheduler_job_locks (
    job_key, execution_id, lease_token, acquired_at, lease_expires_at
  ) values (
    requested_job_key, requested_execution_id, requested_lease_token,
    requested_now, requested_lease_expires_at
  )
  on conflict (job_key) do update set
    execution_id = excluded.execution_id,
    lease_token = excluded.lease_token,
    acquired_at = excluded.acquired_at,
    lease_expires_at = excluded.lease_expires_at
  where public.scheduler_job_locks.lease_expires_at <= requested_now;
  return exists (
    select 1 from public.scheduler_job_locks
    where job_key = requested_job_key
      and lease_token = requested_lease_token
      and execution_id = requested_execution_id
  );
end;
$$;

create or replace function public.release_scheduler_job_lock(
  requested_job_key text,
  requested_lease_token uuid
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare deleted_count integer;
begin
  delete from public.scheduler_job_locks
  where job_key = requested_job_key and lease_token = requested_lease_token;
  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;

insert into public.scheduler_job_definitions (
  job_key, display_name, description, cron_schedule, timeout_ms,
  max_retries, backoff_ms
) values
  ('risk-detection', 'Risk detection', 'Run deterministic risk detection for active organizations.', '0 3 * * *', 900000, 2, 300000),
  ('portfolio-refresh', 'Portfolio refresh', 'Refresh portfolio intelligence and analytics snapshots.', '*/5 * * * *', 1200000, 2, 300000),
  ('daily-brief', 'Daily Brief generation', 'Generate and deliver organization Daily Briefs.', '*/5 * * * *', 900000, 2, 300000),
  ('privacy-cleanup', 'Privacy cleanup', 'Apply configured privacy retention and deletion policies.', '30 2 * * *', 900000, 1, 600000),
  ('customer-data-exports', 'Customer data exports', 'Process pending customer export requests.', '*/5 * * * *', 900000, 2, 120000);

alter table public.scheduler_job_definitions enable row level security;
alter table public.scheduler_job_executions enable row level security;
alter table public.scheduler_job_locks enable row level security;
grant all on public.scheduler_job_definitions, public.scheduler_job_executions,
  public.scheduler_job_locks to service_role;
revoke all on function public.acquire_scheduler_job_lock(
  text, uuid, uuid, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.release_scheduler_job_lock(text, uuid)
  from public, anon, authenticated;
grant execute on function public.acquire_scheduler_job_lock(
  text, uuid, uuid, timestamptz, timestamptz
) to service_role;
grant execute on function public.release_scheduler_job_lock(text, uuid)
  to service_role;
