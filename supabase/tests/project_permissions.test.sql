begin;
select plan(6);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_memberships'
      and column_name = 'role'
  ),
  'project memberships store a project role'
);

select ok(
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'project_invitations'
  ),
  'project invitations exist'
);

select ok(
  exists (
    select 1 from pg_proc where proname = 'current_project_role'
  ),
  'current project role helper exists'
);

select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'risk_evidence'
      and policyname = 'risk_evidence_project_select'
  ),
  'evidence inherits project visibility'
);

select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'risk_activities'
      and policyname = 'risk_activities_project_select'
  ),
  'comments and activity inherit project visibility'
);

select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'risk_conversations'
      and policyname = 'risk_conversations_project_select'
  ),
  'AI conversations inherit project visibility'
);

select * from finish();
rollback;
