begin;
select plan(10);

select has_table('public', 'meetings', 'meetings table exists');
select has_table('public', 'meeting_decisions', 'meeting decisions table exists');
select has_table('public', 'meeting_follow_ups', 'meeting follow-up linkage exists');
select col_not_null('public', 'meetings', 'organization_id', 'meetings are tenant scoped');
select col_not_null('public', 'meeting_decisions', 'organization_id', 'decisions are tenant scoped');
select col_not_null('public', 'meeting_follow_ups', 'organization_id', 'follow-ups are tenant scoped');
select is((select relrowsecurity from pg_class where oid = 'public.meetings'::regclass), true, 'meetings have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.meeting_decisions'::regclass), true, 'decisions have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.meeting_follow_ups'::regclass), true, 'follow-ups have RLS');
select is_empty($$ select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('meetings', 'meeting_decisions', 'meeting_follow_ups') and grantee = 'anon' $$, 'anonymous users have no meeting access');

select * from finish();
rollback;
