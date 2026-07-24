begin;
select plan(16);

select has_table('public', 'organization_privacy_settings', 'privacy settings exist');
select has_table('public', 'privacy_deletion_requests', 'deletion request ledger exists');
select has_column('public', 'organizations', 'privacy_status', 'organization has privacy status');
select has_column('public', 'organizations', 'legal_hold_enabled', 'organization has legal hold placeholder');
select has_column('public', 'users', 'scheduled_deletion_at', 'user has deletion countdown');
select has_function('public', 'claim_due_privacy_requests', array['integer'], 'cleanup claim function exists');
select has_function('public', 'purge_expired_organization_data', array['uuid'], 'retention purge function exists');

select is(
  (select confdeltype::text from pg_constraint where conname = 'audit_logs_organization_id_fkey'),
  'n', 'audit organization reference is retained with SET NULL'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.organization_privacy_settings'::regclass),
  true, 'privacy settings use RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.privacy_deletion_requests'::regclass),
  true, 'deletion requests use RLS'
);
select has_index('public', 'privacy_deletion_requests', 'privacy_deletion_requests_due_idx', 'due cleanup is indexed');
select has_index('public', 'privacy_deletion_requests', 'privacy_deletion_requests_active_org_idx', 'active org request is unique');
select has_index('public', 'privacy_deletion_requests', 'privacy_deletion_requests_active_user_idx', 'active user request is unique');
select trigger_is('public', 'organizations', 'organizations_create_privacy_settings', 'public', 'create_organization_privacy_settings', 'new organizations get defaults');
select trigger_is('public', 'audit_logs', 'audit_logs_reject_update_delete', 'public', 'reject_audit_log_mutation', 'audit immutability remains enforced');
select col_default_is('public', 'organizations', 'privacy_status', 'active', 'organizations start active');

select * from finish();
rollback;
