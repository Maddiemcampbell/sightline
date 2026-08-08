begin;
select plan(17);

select has_table('public', 'integration_connections', 'connection table exists');
select has_table('public', 'integration_credentials', 'credential table exists');
select has_table('public', 'integration_project_mappings', 'mapping table exists');
select has_table('public', 'integration_sync_cursors', 'cursor table exists');
select has_table('public', 'integration_external_records', 'provenance table exists');
select col_not_null('public', 'integration_connections', 'organization_id', 'connection is tenant scoped');
select col_not_null('public', 'integration_connections', 'company_id', 'company id is required');
select col_not_null('public', 'integration_credentials', 'encrypted_client_secret', 'secret is encrypted at rest');
select col_not_null('public', 'integration_project_mappings', 'procore_project_id', 'external project id is required');
select col_not_null('public', 'integration_sync_cursors', 'resource_type', 'cursor resource is required');
select is((select relrowsecurity from pg_class where oid = 'public.integration_connections'::regclass), true, 'connections have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.integration_credentials'::regclass), true, 'credentials have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.integration_project_mappings'::regclass), true, 'mappings have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.integration_external_records'::regclass), true, 'provenance has RLS');
select is_empty($$ select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'integration_credentials' and grantee in ('anon', 'authenticated') $$, 'credentials have no customer grants');
select is_empty($$ select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('integration_sync_cursors', 'integration_external_records') and grantee in ('anon', 'authenticated') $$, 'sync internals have no customer grants');
select is((select count(*) from pg_indexes where schemaname = 'public' and indexname = 'integration_external_records_project_resource_idx'), 1::bigint, 'provenance project index exists');

select * from finish();
rollback;
