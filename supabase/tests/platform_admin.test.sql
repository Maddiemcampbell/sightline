begin;
select plan(15);

select has_table('public', 'platform_operators', 'platform operators exist');
select has_table(
  'public', 'platform_operator_permissions',
  'operator capability grants exist'
);
select has_table(
  'public', 'platform_audit_logs',
  'separate platform audit ledger exists'
);
select has_column(
  'public', 'platform_operators', 'mfa_required',
  'operator model supports future MFA enforcement'
);
select is(
  (select relrowsecurity from pg_class
   where oid = 'public.platform_operators'::regclass),
  true,
  'platform operators use RLS'
);
select is(
  (select relrowsecurity from pg_class
   where oid = 'public.platform_operator_permissions'::regclass),
  true,
  'platform permissions use RLS'
);
select is(
  (select relrowsecurity from pg_class
   where oid = 'public.platform_audit_logs'::regclass),
  true,
  'platform audit ledger uses RLS'
);
select has_index(
  'public', 'platform_audit_logs', 'platform_audit_logs_time_idx',
  'platform audit history is indexed'
);
select trigger_is(
  'public', 'platform_audit_logs', 'platform_audit_logs_reject_update_delete',
  'public', 'reject_platform_audit_mutation',
  'platform audit records are append-only'
);
select trigger_is(
  'public', 'platform_operators', 'platform_operators_separation_guard',
  'public', 'enforce_platform_operator_separation',
  'operator creation enforces customer separation'
);
select trigger_is(
  'public', 'organization_memberships',
  'organization_memberships_platform_separation_guard',
  'public', 'enforce_platform_operator_separation',
  'customer membership creation enforces staff separation'
);
select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'platform_operators'
     and policyname = 'platform_operators_self_select'),
  1,
  'proxy-safe self lookup policy exists'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.platform_operator_permissions'::regclass
      and pg_get_constraintdef(oid) like '%platform.dashboard.read%'
      and pg_get_constraintdef(oid) like '%platform.admin.manage%'
  ),
  'capability grant constraint covers platform permissions'
);
select col_default_is(
  'public', 'platform_operators', 'status', 'active',
  'new platform operators start active'
);
select is(
  (select count(*)::integer from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'platform_audit_logs'
     and grantee = 'authenticated'),
  0,
  'platform audit records have no direct authenticated grants'
);

select * from finish();
rollback;
