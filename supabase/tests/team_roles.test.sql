begin;
select plan(6);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'organization_memberships_role_check'
  ),
  'membership role constraint exists'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'organization_memberships_owner_guard'
      and not tgisinternal
  ),
  'last-owner database guard exists'
);

select ok(
  exists (
    select 1 from pg_proc
    where proname = 'transfer_organization_ownership'
  ),
  'atomic ownership transfer function exists'
);

select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'projects' and policyname = 'projects_role_select'
  ),
  'projects use a role-aware select policy'
);

select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'risks' and policyname = 'risks_manager_update'
  ),
  'risk mutation policy is role-aware'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'recommended_actions_contributor_update_guard'
      and not tgisinternal
  ),
  'contributor action updates have a database guard'
);

select * from finish();
rollback;
