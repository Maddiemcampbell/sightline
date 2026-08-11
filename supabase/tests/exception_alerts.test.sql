begin;
select plan(12);

select has_table('public', 'exception_alert_rules', 'exception alert rules exist');
select has_table('public', 'exception_alerts', 'durable exception alerts exist');
select has_column('public', 'documents', 'expires_on', 'documents can record an expiration date');
select col_is_pk('public', 'exception_alert_rules', 'organization_id', 'one rule set exists per organization');
select col_not_null('public', 'exception_alerts', 'organization_id', 'alerts are tenant scoped');
select col_not_null('public', 'exception_alerts', 'fingerprint', 'alerts have a stable deduplication key');
select has_index('public', 'exception_alerts', 'exception_alerts_active_idx', 'active exceptions are indexed');
select has_index('public', 'documents', 'documents_expiry_idx', 'expiring documents are indexed');
select is((select relrowsecurity from pg_class where oid = 'public.exception_alert_rules'::regclass), true, 'rule settings use RLS');
select is((select relrowsecurity from pg_class where oid = 'public.exception_alerts'::regclass), true, 'alerts use RLS');
select is_empty($$ select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('exception_alert_rules', 'exception_alerts') and grantee = 'anon' $$, 'anonymous users cannot access exception configuration or alerts');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.notifications'::regclass and conname = 'notifications_type_check' and pg_get_constraintdef(oid) like '%exception_alert%'), 'exception notifications are supported');

select * from finish();
rollback;
