begin;
select plan(12);

select has_table(
  'public', 'organization_job_schedules',
  'organization job schedules exist'
);
select has_table(
  'public', 'organization_job_runs',
  'organization job execution history exists'
);
select is(
  (select relrowsecurity from pg_class
   where oid = 'public.organization_job_schedules'::regclass),
  true,
  'organization schedules use RLS'
);
select is(
  (select relrowsecurity from pg_class
   where oid = 'public.organization_job_runs'::regclass),
  true,
  'organization run history uses RLS'
);
select has_index(
  'public', 'organization_job_runs', 'organization_job_runs_history_idx',
  'organization run history is indexed'
);
select has_index(
  'public', 'organization_job_runs', 'organization_job_runs_retry_idx',
  'retryable organization runs are indexed'
);
select col_default_is(
  'public', 'organization_job_runs', 'status', 'queued',
  'new organization jobs start queued'
);
select trigger_is(
  'public', 'organization_job_runs', 'organization_job_runs_set_updated_at',
  'public', 'set_updated_at', 'job run updates are timestamped'
);
select trigger_is(
  'public', 'organizations', 'organizations_create_default_job_schedule',
  'public', 'create_default_organization_job_schedule',
  'new organizations get default automation schedules'
);
select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'organization_job_runs'
     and policyname = 'organization_job_runs_admin_select'),
  1,
  'authorized run history policy exists'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.organization_job_runs'::regclass
      and pg_get_constraintdef(oid) like
        '%UNIQUE (organization_id, job_type, idempotency_key)%'
  ),
  'scheduled execution is idempotent per organization and job type'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_type_check'
      and pg_get_constraintdef(oid) like '%background_job_failed%'
  ),
  'background job failure notifications are supported'
);

select * from finish();
rollback;
