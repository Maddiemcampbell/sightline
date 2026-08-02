begin;
select plan(16);

select has_column('public', 'organizations', 'plan_key', 'organizations persist their launch plan');
select has_column('public', 'projects', 'archived_at', 'projects support explicit archival');
select has_function(
  'public', 'create_entitled_project',
  array['uuid','uuid','text','text','text','text','text','text','date','date'],
  'project creation has a transactional entitlement boundary'
);
select has_function(
  'public', 'set_project_archived', array['uuid','uuid','uuid','boolean'],
  'project restore has a transactional entitlement boundary'
);
select is(public.organization_project_limit('essential'), 5, 'Essential permits five active projects');
select is(public.organization_project_limit('professional'), 10, 'Professional permits ten active projects');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'e1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'plan-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);
insert into public.organizations (id, name, slug)
values ('e2000000-0000-4000-8000-000000000001', 'Plan Test', 'plan-test');
insert into public.users (id, organization_id, auth_user_id, email, full_name, role)
values (
  'e3000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'plan-owner@example.com', 'Plan Owner', 'admin'
);
insert into public.organization_memberships (
  id, organization_id, auth_user_id, application_user_id, role
) values (
  'e4000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000001', 'owner'
);
insert into public.organizations (id, name, slug)
values ('e2000000-0000-4000-8000-000000000002', 'Second Plan Test', 'second-plan-test');
insert into public.users (id, organization_id, auth_user_id, email, full_name, role)
values (
  'e3000000-0000-4000-8000-000000000002',
  'e2000000-0000-4000-8000-000000000002',
  'e1000000-0000-4000-8000-000000000001',
  'plan-owner@example.com', 'Plan Owner', 'admin'
);
select throws_ok(
  $$insert into public.organization_memberships (
    id, organization_id, auth_user_id, application_user_id, role
  ) values (
    'e4000000-0000-4000-8000-000000000002',
    'e2000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000001',
    'e3000000-0000-4000-8000-000000000002', 'owner'
  )$$,
  'P0001', 'PLAN_SINGLE_ORGANIZATION_ONLY',
  'a user cannot join a second organization'
);
insert into public.projects (id, organization_id, name, project_number)
select gen_random_uuid(), 'e2000000-0000-4000-8000-000000000001',
  'Project ' || value, 'PLAN-' || value
from generate_series(1, 5) value;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated","email":"plan-owner@example.com"}',
  true
);

select throws_ok(
  $$select public.create_entitled_project(
    'e2000000-0000-4000-8000-000000000001',
    'e3000000-0000-4000-8000-000000000001',
    'Over Limit', 'PLAN-6', null, null, null, null, null, null
  )$$,
  'P0001', 'PLAN_PROJECT_LIMIT_REACHED',
  'Essential rejects a sixth active project'
);
select lives_ok(
  $$select public.set_project_archived(
    'e2000000-0000-4000-8000-000000000001',
    (select id from public.projects where project_number = 'PLAN-1'),
    'e3000000-0000-4000-8000-000000000001', true
  )$$,
  'an active project can be archived'
);
select lives_ok(
  $$select public.create_entitled_project(
    'e2000000-0000-4000-8000-000000000001',
    'e3000000-0000-4000-8000-000000000001',
    'Replacement', 'PLAN-6', null, null, null, null, null, null
  )$$,
  'archiving frees one project slot'
);
select throws_ok(
  $$select public.set_project_archived(
    'e2000000-0000-4000-8000-000000000001',
    (select id from public.projects where project_number = 'PLAN-1'),
    'e3000000-0000-4000-8000-000000000001', false
  )$$,
  'P0001', 'PLAN_PROJECT_LIMIT_REACHED',
  'restore is rejected while the plan is at capacity'
);
select is(
  (select count(*)::integer from public.projects
   where organization_id = 'e2000000-0000-4000-8000-000000000001'
     and archived_at is null),
  5,
  'failed restore does not exceed capacity'
);
select throws_ok(
  $$insert into public.projects (organization_id, name, project_number)
    values ('e2000000-0000-4000-8000-000000000001', 'Direct Bypass', 'PLAN-7')$$,
  'P0001', 'PLAN_PROJECT_LIMIT_REACHED',
  'direct table inserts cannot bypass project capacity'
);
select throws_like(
  $$update public.organizations set plan_key = 'professional'
    where id = 'e2000000-0000-4000-8000-000000000001'$$,
  '%permission denied%',
  'customer sessions cannot elevate their billing plan'
);
select is(
  (select plan_key from public.organizations
   where id = 'e2000000-0000-4000-8000-000000000001'),
  'essential',
  'new organizations default to Essential'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'organization_memberships_single_organization_guard'
  ),
  'a database guard enforces one organization per Auth user'
);

select * from finish();
rollback;
