begin;
select plan(19);

select has_table('public', 'scheduler_job_definitions', 'scheduler definitions exist');
select has_table('public', 'scheduler_job_executions', 'scheduler executions exist');
select has_table('public', 'scheduler_job_locks', 'scheduler leases exist');
select has_function(
  'public', 'acquire_scheduler_job_lock',
  array['text', 'uuid', 'uuid', 'timestamp with time zone', 'timestamp with time zone'],
  'atomic scheduler lease acquisition exists'
);
select has_function(
  'public', 'release_scheduler_job_lock', array['text', 'uuid'],
  'token-scoped scheduler lease release exists'
);
select has_index(
  'public', 'scheduler_job_executions', 'scheduler_executions_retry_idx',
  'persisted retries are indexed'
);
select has_column(
  'public', 'scheduler_job_definitions', 'maximum_backoff_ms',
  'retry policies persist a maximum backoff'
);
select has_index(
  'public', 'scheduler_job_executions', 'scheduler_executions_status_created_idx',
  'status history filtering is indexed'
);
select has_index(
  'public', 'scheduler_job_executions', 'scheduler_executions_trigger_created_idx',
  'trigger history filtering is indexed'
);
select lives_ok(
  $$ insert into public.scheduler_job_executions (
       job_key, trigger_type, status, attempt_number, safe_error_summary
     ) values (
       'risk-detection', 'retry', 'dead_lettered', 3, 'Retries exhausted'
     ) $$,
  'exhausted retries can be retained in the dead letter'
);
select is(
  (select count(*)::integer from public.scheduler_job_definitions),
  6, 'six recurring jobs are registered'
);
select is(
  (select count(*)::integer from public.scheduler_job_definitions
   where cron_schedule in ('0 3 * * *', '30 2 * * *', '*/5 * * * *')),
  6, 'registered dispatcher cadences are persisted'
);

insert into public.scheduler_job_executions (
  id, job_key, trigger_type, root_execution_id, status, started_at
) values (
  '91000000-0000-4000-8000-000000000001',
  'risk-detection', 'manual',
  '91000000-0000-4000-8000-000000000001',
  'running', '2026-07-27T00:00:00Z'
), (
  '91000000-0000-4000-8000-000000000002',
  'risk-detection', 'manual',
  '91000000-0000-4000-8000-000000000002',
  'queued', null
);

select ok(public.acquire_scheduler_job_lock(
  'risk-detection',
  '91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  '2026-07-27T00:00:00Z', '2026-07-27T00:10:00Z'
), 'first scheduler instance acquires the lease');
select isnt(public.acquire_scheduler_job_lock(
  'risk-detection',
  '91000000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000002',
  '2026-07-27T00:01:00Z', '2026-07-27T00:11:00Z'
), true, 'a separate scheduler instance cannot overlap');
select ok(public.acquire_scheduler_job_lock(
  'risk-detection',
  '91000000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000002',
  '2026-07-27T00:11:00Z', '2026-07-27T00:21:00Z'
), 'an expired lease can be recovered');
select is(
  (select status from public.scheduler_job_executions
   where id = '91000000-0000-4000-8000-000000000001'),
  'timed_out', 'stale lease recovery closes the abandoned execution'
);
select isnt(public.release_scheduler_job_lock(
  'risk-detection', '92000000-0000-4000-8000-000000000001'
), true, 'an obsolete owner cannot release a recovered lease');
select ok(public.release_scheduler_job_lock(
  'risk-detection', '92000000-0000-4000-8000-000000000002'
), 'the current owner releases the lease');
select is(
  (select count(*)::integer from public.scheduler_job_locks),
  0, 'no scheduler leases remain after release'
);

select * from finish();
rollback;
