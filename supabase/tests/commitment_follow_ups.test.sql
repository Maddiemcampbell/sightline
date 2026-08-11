begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'commitment_follow_ups', 'commitment follow-ups table exists');
select has_column('public', 'commitment_follow_ups', 'organization_id', 'follow-ups are tenant scoped');
select has_column('public', 'commitment_follow_ups', 'email_draft_id', 'follow-ups retain their originating draft');
select has_column('public', 'commitment_follow_ups', 'recommended_action_id', 'follow-ups can retain an operational action');
select has_column('public', 'commitment_follow_ups', 'expected_response_at', 'follow-ups have an expected response time');
select has_column('public', 'commitment_follow_ups', 'response_evidence_id', 'follow-ups can link response evidence');
select has_column('public', 'commitment_follow_ups', 'verified_by_user_id', 'verification records the human actor');
select col_not_null('public', 'commitment_follow_ups', 'requested_commitment', 'a requested commitment is required');
select col_not_null('public', 'commitment_follow_ups', 'owner_user_id', 'an accountable owner is required');
select col_is_fk('public', 'commitment_follow_ups', 'organization_id', 'organization scope is enforced by foreign key');

select * from finish();
rollback;
