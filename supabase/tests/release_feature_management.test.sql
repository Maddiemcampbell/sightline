begin;
select plan(18);

select has_table('public', 'feature_flags', 'feature flags exist');
select has_table('public', 'feature_flag_changes', 'flag change history exists');
select has_table(
  'public', 'feature_flag_evaluation_logs',
  'debug evaluation history exists'
);
select has_table('public', 'releases', 'release records exist');
select has_table(
  'public', 'release_feature_flags',
  'release-to-flag links exist'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.feature_flags'::regclass),
  true, 'feature flags use RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.releases'::regclass),
  true, 'releases use RLS'
);
select is(
  (select count(*)::integer from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'feature_flags'
     and grantee in ('anon', 'authenticated')),
  0, 'customer roles cannot read internal flag targeting'
);
select is(
  (select count(*)::integer from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'releases'
     and grantee in ('anon', 'authenticated')),
  0, 'customer roles cannot read release metadata'
);
select has_index(
  'public', 'feature_flags', 'feature_flags_status_environment_idx',
  'flag management is indexed'
);
select has_index(
  'public', 'releases', 'releases_environment_status_date_idx',
  'release filtering is indexed'
);

insert into public.feature_flags (
  id, flag_key, name, enabled, environments, rollout_percentage
) values (
  '93000000-0000-4000-8000-000000000001',
  'test-release-flag', 'Test release flag', true, array['production'], 25
);
insert into public.releases (
  id, release_identifier, application_version, environment, status
) values (
  '94000000-0000-4000-8000-000000000001',
  'test-2026.07.27', '0.1.0', 'production', 'failed'
);
insert into public.release_feature_flags (release_id, feature_flag_id) values (
  '94000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001'
);

select is(
  (select status from public.releases
   where id = '94000000-0000-4000-8000-000000000001'),
  'failed', 'failed releases can be recorded'
);
update public.releases
set status = 'rolled_back', rollback_status = 'rolled_back'
where id = '94000000-0000-4000-8000-000000000001';
select is(
  (select status from public.releases
   where id = '94000000-0000-4000-8000-000000000001'),
  'rolled_back', 'rolled-back releases can be recorded'
);
select is(
  (select rollback_status from public.releases
   where id = '94000000-0000-4000-8000-000000000001'),
  'rolled_back', 'rollback status is retained'
);
select is(
  (select count(*)::integer from public.release_feature_flags
   where release_id = '94000000-0000-4000-8000-000000000001'),
  1, 'releases link to feature flags'
);
select is(
  (select rollout_percentage from public.feature_flags
   where id = '93000000-0000-4000-8000-000000000001'),
  25::smallint, 'percentage rollout configuration is retained'
);
select trigger_is(
  'public', 'feature_flags', 'feature_flags_set_updated_at',
  'public', 'set_updated_at', 'flag updates are timestamped'
);
select trigger_is(
  'public', 'releases', 'releases_set_updated_at',
  'public', 'set_updated_at', 'release updates are timestamped'
);

select * from finish();
rollback;
