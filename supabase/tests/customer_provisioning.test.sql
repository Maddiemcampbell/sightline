begin;
select plan(12);

select has_table('public', 'customer_access_requests', 'access requests exist before tenants');
select has_table('public', 'organization_billing_accounts', 'provider-neutral billing accounts exist');
select has_table('public', 'billing_provider_events', 'sanitized billing events exist');
select has_table('public', 'customer_provisioning_attempts', 'provisioning history exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.customer_access_requests'::regclass),
  true,
  'access requests use RLS'
);
select table_privs_are(
  'public', 'customer_access_requests', 'authenticated', array[]::text[],
  'customer sessions cannot read commercial onboarding requests'
);
select table_privs_are(
  'public', 'organization_billing_accounts', 'authenticated', array[]::text[],
  'customer sessions cannot read billing records directly'
);
select has_index(
  'public', 'customer_access_requests', 'customer_access_requests_queue_idx',
  'the provisioning queue is indexed'
);
select has_index(
  'public', 'customer_access_requests', 'customer_access_requests_active_slug_idx',
  'active provisioning slugs cannot collide'
);
select has_function(
  'public', 'complete_customer_owner_activation', array['text', 'uuid'],
  'atomic Owner activation function exists'
);
select function_privs_are(
  'public', 'complete_customer_owner_activation', array['text', 'uuid'],
  'authenticated', array[]::text[],
  'customer sessions cannot invoke provisioning directly'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.platform_operator_permissions'::regclass
      and pg_get_constraintdef(oid) like '%platform.provisioning.manage%'
  ),
  'customer provisioning has a dedicated platform capability'
);

select * from finish();
rollback;
