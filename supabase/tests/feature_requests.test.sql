begin;
select plan(12);

select has_table('public', 'feature_requests', 'feature requests table exists');
select has_table('public', 'feature_request_attachments', 'feature request attachments table exists');
select has_table('public', 'feature_request_internal_notes', 'feature request notes table exists');
select col_is_pk('public', 'feature_requests', 'id', 'request id is primary key');
select col_not_null('public', 'feature_requests', 'organization_id', 'organization is required');
select col_not_null('public', 'feature_requests', 'reporting_user_id', 'reporting user is required');
select col_not_null('public', 'feature_requests', 'idempotency_key', 'idempotency is required');
select is(
  (select relrowsecurity from pg_class where oid = 'public.feature_requests'::regclass),
  true, 'requests have RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.feature_request_attachments'::regclass),
  true, 'attachments have RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.feature_request_internal_notes'::regclass),
  true, 'notes have RLS'
);
select is_empty(
  $$ select * from information_schema.role_table_grants
     where table_schema = 'public'
       and table_name in ('feature_requests', 'feature_request_attachments', 'feature_request_internal_notes')
       and grantee in ('anon', 'authenticated') $$,
  'customer roles have no direct table grants'
);
select is(
  (select public from storage.buckets where id = 'feature-request-attachments'),
  false,
  'attachment bucket is private'
);

select * from finish();
rollback;
