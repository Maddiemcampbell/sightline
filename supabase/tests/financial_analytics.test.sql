begin;
select plan(12);

select has_table('public', 'project_financials', 'project financial inputs exist');
select has_table('public', 'financial_change_orders', 'change orders exist');
select has_table('public', 'financial_cash_events', 'scheduled cash events exist');
select has_table(
  'public',
  'portfolio_financial_snapshots',
  'monthly portfolio snapshots exist'
);

select col_is_fk(
  'public',
  'project_financials',
  array['project_id', 'organization_id'],
  'financial inputs belong to a project within the same organization'
);

select ok(
  (select relrowsecurity from pg_class
   where oid = 'public.project_financials'::regclass),
  'project financial inputs have RLS'
);

select ok(
  (select relrowsecurity from pg_class
   where oid = 'public.financial_cash_events'::regclass),
  'cash events have RLS'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_financials'
      and policyname = 'project_financials_owner_select'
      and qual like '%current_organization_role%'
      and qual like '%can_access_project%'
  ),
  'financial reads require owner role and project access'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.portfolio_financial_snapshots'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid)
        like '%organization_id, snapshot_month%'
  ),
  'monthly snapshot creation is tenant-scoped and idempotent'
);

select is(
  (
    select count(*)::integer
    from public.project_financials
    where organization_id = '10000000-0000-4000-8000-000000000001'
  ),
  3,
  'demo organization includes complete, partial, and missing financial cases'
);

select ok(
  exists (
    select 1 from public.financial_change_orders
    where organization_id = '10000000-0000-4000-8000-000000000001'
      and status = 'approved'
  )
  and exists (
    select 1 from public.financial_change_orders
    where organization_id = '10000000-0000-4000-8000-000000000001'
      and status = 'pending'
  ),
  'demo organization includes approved and pending change orders'
);

select ok(
  exists (
    select 1 from public.portfolio_financial_snapshots
    where organization_id = '10000000-0000-4000-8000-000000000001'
      and snapshot_month = '2026-06-01'
  ),
  'demo organization includes prior monthly financial history'
);

select * from finish();
rollback;
