begin;
select plan(11);

select has_table('public', 'microsoft365_consent_states', 'consent state table exists');
select has_table('public', 'microsoft365_library_mappings', 'library mapping table exists');
select col_not_null('public', 'microsoft365_library_mappings', 'organization_id', 'mapping is tenant scoped');
select col_not_null('public', 'microsoft365_library_mappings', 'drive_id', 'drive id is required');
select col_not_null('public', 'microsoft365_library_mappings', 'integration_source_id', 'provenance source is required');
select is((select relrowsecurity from pg_class where oid = 'public.microsoft365_consent_states'::regclass), true, 'consent states have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.microsoft365_library_mappings'::regclass), true, 'library mappings have RLS');
select is_empty($$ select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'microsoft365_consent_states' and grantee in ('anon', 'authenticated') $$, 'consent states have no customer grants');
select is((select count(*) from pg_indexes where schemaname = 'public' and indexname = 'microsoft365_library_mappings_sync_idx'), 1::bigint, 'mapping sync index exists');
select ok(exists(select 1 from pg_constraint where conname = 'organization_job_runs_job_type_check' and pg_get_constraintdef(oid) like '%microsoft365_sync%'), 'job queue accepts Microsoft sync');
select ok(exists(select 1 from pg_constraint where conname = 'job_monitoring_alerts_job_type_check' and pg_get_constraintdef(oid) like '%microsoft365_sync%'), 'monitoring accepts Microsoft sync');

select * from finish();
rollback;
