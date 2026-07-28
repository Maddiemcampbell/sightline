begin;
select plan(12);

select has_table('public', 'bug_reports', 'bug reports table exists');
select has_table('public', 'bug_report_attachments', 'attachments table exists');
select has_table('public', 'bug_report_internal_notes', 'internal notes table exists');
select col_is_pk('public', 'bug_reports', 'id', 'report id is primary key');
select col_not_null('public', 'bug_reports', 'organization_id', 'organization is required');
select col_not_null('public', 'bug_reports', 'reporting_user_id', 'reporting user is required');
select col_not_null('public', 'bug_reports', 'idempotency_key', 'idempotency is required');
select is(
  (select relrowsecurity from pg_class where oid = 'public.bug_reports'::regclass),
  true, 'reports have RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.bug_report_attachments'::regclass),
  true, 'attachments have RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.bug_report_internal_notes'::regclass),
  true, 'notes have RLS'
);
select is_empty(
  $$ select * from information_schema.role_table_grants
     where table_schema = 'public'
       and table_name in ('bug_reports', 'bug_report_attachments', 'bug_report_internal_notes')
       and grantee in ('anon', 'authenticated') $$,
  'customer roles have no direct table grants'
);
select is(
  (select public from storage.buckets where id = 'bug-report-attachments'),
  false,
  'attachment bucket is private'
);

select * from finish();
rollback;
