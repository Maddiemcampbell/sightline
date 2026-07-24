begin;
select plan(10);

select has_table('public', 'portfolio_observations', 'portfolio observation model exists');
select has_table('public', 'risk_relationships', 'risk relationship graph exists');

select col_is_fk(
  'public',
  'portfolio_observations',
  'organization_id',
  'observations belong to an organization'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.portfolio_observations'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%organization_id, observation_key%'
  ),
  'observation identity is tenant scoped'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.portfolio_observations'::regclass),
  'portfolio observations have RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.risk_relationships'::regclass),
  'risk relationships have RLS enabled'
);

select policies_are(
  'public',
  'portfolio_observations',
  array['portfolio_observations_leadership_select'],
  'observations expose one centralized leadership read policy'
);

select policies_are(
  'public',
  'risk_relationships',
  array['risk_relationships_project_select'],
  'relationships expose one project-scoped read policy'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.risk_relationships'::regclass
      and pg_get_constraintdef(oid) like '%source_risk_id <> target_risk_id%'
  ),
  'self relationships are rejected'
);

select ok(
  has_table_privilege('service_role', 'public.portfolio_observations', 'INSERT')
  and not has_table_privilege('authenticated', 'public.portfolio_observations', 'INSERT'),
  'only the trusted service can materialize observations'
);

select * from finish();
rollback;
