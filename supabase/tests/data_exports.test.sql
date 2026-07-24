begin;
select plan(14);

select has_table('public', 'organization_data_exports', 'export job table exists');
select has_column('public', 'organization_data_exports', 'manifest', 'exports store a manifest');
select has_column('public', 'organization_data_exports', 'checksum_sha256', 'exports store integrity checksum');
select has_function('public', 'claim_organization_data_exports', array['integer'], 'async claim function exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.organization_data_exports'::regclass),
  true,
  'export history uses RLS'
);
select has_index('public', 'organization_data_exports', 'organization_data_exports_history_idx', 'history is indexed');
select has_index('public', 'organization_data_exports', 'organization_data_exports_queue_idx', 'queue is indexed');
select has_index('public', 'organization_data_exports', 'organization_data_exports_expiry_idx', 'expiry cleanup is indexed');
select is(
  (select public from storage.buckets where id = 'organization-exports'),
  false,
  'export bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'organization-exports'),
  52428800::bigint,
  'export artifacts have a size limit'
);
select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and (qual like '%organization-exports%' or with_check like '%organization-exports%')),
  0,
  'export bucket has no direct client access policy'
);
select col_default_is('public', 'organization_data_exports', 'status', 'queued', 'exports start queued');
select trigger_is(
  'public', 'organization_data_exports', 'organization_data_exports_set_updated_at',
  'public', 'set_updated_at', 'export updates are timestamped'
);
select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'organization_data_exports'
     and policyname = 'organization_data_exports_admin_select'),
  1,
  'authorized history policy exists'
);

select * from finish();
rollback;

