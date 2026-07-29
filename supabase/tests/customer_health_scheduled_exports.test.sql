begin;
select plan(16);

select has_view(
  'public', 'platform_customer_health',
  'platform customer health read model exists'
);
select has_column('public', 'platform_customer_health', 'last_login_at', 'login recency is available');
select has_column('public', 'platform_customer_health', 'onboarding_completion_percent', 'onboarding completion is available');
select has_column('public', 'platform_customer_health', 'job_failures_30d', 'job failures are available');
select has_column('public', 'platform_customer_health', 'feature_adoption_percent', 'feature adoption is available');
select has_column('public', 'platform_customer_health', 'activity_events_30d', 'organization activity is available');
select is(
  (select count(*)::integer from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'platform_customer_health'
     and grantee = 'authenticated'),
  0,
  'customer roles cannot read platform health aggregates'
);

select has_table('public', 'organization_data_export_schedules', 'recurring export schedules exist');
select is(
  (select relrowsecurity from pg_class
   where oid = 'public.organization_data_export_schedules'::regclass),
  true,
  'recurring export schedules use RLS'
);
select has_column('public', 'organization_data_export_schedules', 'cadence', 'schedule cadence is configurable');
select has_column('public', 'organization_data_export_schedules', 'timezone', 'schedule timezone is configurable');
select has_column('public', 'organization_data_exports', 'schedule_occurrence_key', 'scheduled exports are idempotent');
select has_column('public', 'organization_data_exports', 'next_retry_at', 'export retries are scheduled');
select has_index('public', 'organization_data_exports', 'organization_data_exports_retry_idx', 'retry queue is indexed');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.organization_data_exports'::regclass
      and conname = 'organization_data_exports_schedule_occurrence_unique'
  ),
  'one export is created for each schedule occurrence'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_type_check'
      and pg_get_constraintdef(oid) like '%data_export_failed%'
  ),
  'terminal export failure notifications are supported'
);

select * from finish();
rollback;
