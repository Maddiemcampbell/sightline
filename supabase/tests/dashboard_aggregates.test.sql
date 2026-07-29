begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select has_function(
  'public',
  'get_dashboard_portfolio_aggregates',
  array['uuid', 'timestamp with time zone'],
  'dashboard aggregate function exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'ea000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'dashboard-aggregate@example.com', '',
  now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into public.organizations (id, name, slug)
values (
  'eb000000-0000-4000-8000-000000000001',
  'Dashboard Aggregate Tenant',
  'dashboard-aggregate-tenant'
);

insert into public.users (
  id, organization_id, auth_user_id, email, full_name, role
) values (
  'ec000000-0000-4000-8000-000000000001',
  'eb000000-0000-4000-8000-000000000001',
  'ea000000-0000-4000-8000-000000000001',
  'dashboard-aggregate@example.com',
  'Dashboard Owner',
  'admin'
);

insert into public.organization_memberships (
  id, organization_id, auth_user_id, application_user_id, role
) values (
  'ed000000-0000-4000-8000-000000000001',
  'eb000000-0000-4000-8000-000000000001',
  'ea000000-0000-4000-8000-000000000001',
  'ec000000-0000-4000-8000-000000000001',
  'owner'
);

create temporary table dashboard_project_ids (
  sequence_number integer primary key,
  project_id uuid not null
);
insert into dashboard_project_ids
select sequence_number, gen_random_uuid()
from generate_series(1, 3) sequence_number;

insert into public.projects (
  id, organization_id, name, project_number, status,
  contract_value_cents, projected_margin_cents
)
select
  project_id,
  'eb000000-0000-4000-8000-000000000001',
  'Aggregate Project ' || sequence_number,
  'AGG-' || sequence_number,
  'active',
  10000000,
  1000000
from dashboard_project_ids;

insert into public.risks (
  organization_id, project_id, title, summary, category, severity, status,
  potential_exposure_cents, estimated_margin_impact_cents, confidence_score,
  why_it_matters, detected_at
)
select
  'eb000000-0000-4000-8000-000000000001',
  project_id,
  'Aggregate Risk ' || sequence_number,
  'Aggregate correctness fixture',
  case when sequence_number = 3 then 'financial' else 'schedule' end
    ::public.risk_category,
  case when sequence_number = 1 then 'high' else 'medium' end
    ::public.risk_severity,
  'action_needed',
  sequence_number * 100000,
  sequence_number * 50000,
  80,
  'The fixture verifies grouped dashboard results.',
  '2026-07-28T12:00:00Z'
from dashboard_project_ids;

insert into public.risks (
  organization_id, project_id, title, summary, category, severity, status,
  potential_exposure_cents, estimated_margin_impact_cents, confidence_score,
  why_it_matters, detected_at, resolved_at
)
select
  'eb000000-0000-4000-8000-000000000001',
  project_id,
  'Resolved fixture',
  'Must not enter active aggregates',
  'schedule',
  'critical',
  'resolved',
  900000,
  900000,
  90,
  'Resolved risks are excluded.',
  '2026-07-27T12:00:00Z',
  '2026-07-28T10:00:00Z'
from dashboard_project_ids
where sequence_number = 1;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated","email":"dashboard-aggregate@example.com"}',
  true
);

create temporary table dashboard_result as
select public.get_dashboard_portfolio_aggregates(
  'eb000000-0000-4000-8000-000000000001',
  '2026-07-28T16:00:00Z'
) as value;

select is(
  (select (value #>> '{portfolioSummary,activeProjects}')::integer
   from dashboard_result),
  3,
  'active project count matches the database'
);
select is(
  (select (value #>> '{portfolioSummary,projectsAtRisk}')::integer
   from dashboard_result),
  3,
  'projects-at-risk count is complete'
);
select is(
  (select (value #>> '{portfolioSummary,totalExposureCents}')::bigint
   from dashboard_result),
  600000::bigint,
  'active exposure matches direct risk totals'
);
select is(
  (select jsonb_array_length(value -> 'portfolio') from dashboard_result),
  3,
  'one compact portfolio row is returned per active project'
);
select is(
  (select sum((row ->> 'openRiskCount')::integer)
   from dashboard_result,
   lateral jsonb_array_elements(value -> 'portfolio') row),
  3::bigint,
  'project summaries exclude resolved risks'
);
select is(
  (select (row ->> 'riskCount')::integer
   from dashboard_result,
   lateral jsonb_array_elements(value -> 'riskDrivers') row
   where row ->> 'category' = 'schedule'),
  2,
  'risk drivers group the same active records'
);
select is(
  (select jsonb_array_length(value -> 'riskHeatmap') from dashboard_result),
  3,
  'heatmap output is bounded to accessible active projects'
);

select * from finish();
rollback;
