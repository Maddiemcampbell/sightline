begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  'fa000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'pagination@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into public.organizations (id, name, slug, plan_key)
values (
  'fb000000-0000-4000-8000-000000000001',
  'Pagination Tenant',
  'pagination-tenant',
  'professional'
);

insert into public.users (
  id, organization_id, auth_user_id, email, full_name, role
)
values (
  'fc000000-0000-4000-8000-000000000001',
  'fb000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000001',
  'pagination@example.com',
  'Pagination Owner',
  'admin'
);

insert into public.organization_memberships (
  id, organization_id, auth_user_id, application_user_id
)
values (
  'fd000000-0000-4000-8000-000000000001',
  'fb000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000001',
  'fc000000-0000-4000-8000-000000000001'
);

create temporary table pagination_projects (
  sequence_number integer primary key,
  project_id uuid not null
);

insert into pagination_projects (sequence_number, project_id)
select sequence_number, gen_random_uuid()
from generate_series(1, 10) sequence_number;

insert into public.projects (
  id, organization_id, name, project_number, status,
  contract_value_cents, projected_margin_cents
)
select
  project_id,
  'fb000000-0000-4000-8000-000000000001',
  'Load Project ' || lpad(sequence_number::text, 2, '0'),
  'LOAD-' || lpad(sequence_number::text, 2, '0'),
  case when sequence_number <= 8 then 'active' else 'planning' end
    ::public.project_status,
  10000000,
  sequence_number * 10000
from pagination_projects;

insert into public.risks (
  organization_id, project_id, title, summary, category, severity, status,
  potential_exposure_cents, estimated_margin_impact_cents,
  confidence_score, why_it_matters, detected_at
)
select
  'fb000000-0000-4000-8000-000000000001',
  project_id,
  'Load Risk ' || lpad(sequence_number::text, 2, '0'),
  'Bounded pagination fixture',
  'schedule',
  case when sequence_number % 2 = 0 then 'high' else 'medium' end
    ::public.risk_severity,
  'action_needed',
  sequence_number * 100000,
  sequence_number * 50000,
  50 + sequence_number,
  'This fixture verifies complete server-side result counts.',
  now() - make_interval(days => sequence_number)
from pagination_projects;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fa000000-0000-4000-8000-000000000001","role":"authenticated","email":"pagination@example.com"}',
  true
);

select is(
  (public.list_portfolio_projects_page(
    'fb000000-0000-4000-8000-000000000001',
    '', 'all', 'name', 4, 0
  )->>'total')::integer,
  10,
  'project pagination returns an exact total'
);

select is(
  jsonb_array_length(public.list_portfolio_projects_page(
    'fb000000-0000-4000-8000-000000000001',
    '', 'all', 'name', 4, 0
  )->'items'),
  4,
  'project page size is bounded'
);

select is(
  jsonb_array_length(public.list_portfolio_projects_page(
    'fb000000-0000-4000-8000-000000000001',
    '', 'all', 'name', 4, 8
  )->'items'),
  2,
  'project final page contains only remaining records'
);

select is(
  (public.list_portfolio_projects_page(
    'fb000000-0000-4000-8000-000000000001',
    '', 'planning', 'name', 4, 0
  )->>'total')::integer,
  2,
  'project stage filtering executes before pagination'
);

select is(
  (public.list_portfolio_projects_page(
    'fb000000-0000-4000-8000-000000000001',
    'Project 10', 'all', 'name', 4, 0
  )->>'total')::integer,
  1,
  'project search executes before pagination'
);

select is(
  (public.list_portfolio_risks_page(
    'fb000000-0000-4000-8000-000000000001',
    'active', '', 'all', 'all', 'all', 'all', 'all',
    'exposure', 4, 0
  )->>'total')::integer,
  10,
  'risk pagination returns an exact total'
);

select is(
  jsonb_array_length(public.list_portfolio_risks_page(
    'fb000000-0000-4000-8000-000000000001',
    'active', '', 'all', 'all', 'all', 'all', 'all',
    'exposure', 4, 0
  )->'items'),
  4,
  'risk page size is bounded'
);

select is(
  (public.list_portfolio_risks_page(
    'fb000000-0000-4000-8000-000000000001',
    'active', '', 'all', 'high', 'all', 'Load Project 02', 'all',
    'exposure', 20, 0
  )->>'total')::integer,
  1,
  'risk project and severity filters execute server-side'
);

select is(
  (public.list_portfolio_risks_page(
    '10000000-0000-4000-8000-000000000001',
    'all', '', 'all', 'all', 'all', 'all', 'all',
    'exposure', 20, 0
  )->>'total')::integer,
  0,
  'pagination functions do not expose another organization'
);

select is(
  public.get_resolution_value_summary(
    'fb000000-0000-4000-8000-000000000001'
  )->>'risksResolved',
  '0',
  'resolution summary is returned as one aggregate result'
);

select * from finish();
rollback;
