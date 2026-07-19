drop index if exists public.recommended_actions_organization_due_idx;
drop index if exists public.recommended_actions_risk_status_idx;
drop index if exists public.recommended_actions_organization_owner_status_idx;
drop index if exists public.recommended_actions_organization_priority_due_idx;
alter table public.recommended_actions drop constraint if exists recommended_actions_check;

alter table public.recommended_actions alter column status drop default;
alter table public.recommended_actions
  alter column status type text
  using case status::text when 'open' then 'suggested' when 'complete' then 'completed' else status::text end;
alter table public.recommended_actions
  add constraint recommended_actions_status_check
  check (status in ('suggested', 'accepted', 'in_progress', 'completed', 'dismissed'));
alter table public.recommended_actions alter column status set default 'suggested';

alter table public.recommended_actions rename column assigned_user_id to owner_user_id;
alter table public.recommended_actions
  add column action_type text not null default 'other'
    check (action_type in ('email', 'review_document', 'contact_vendor', 'notify_team', 'schedule_meeting', 'open_rfi', 'request_document', 'update_schedule', 'add_mitigation', 'other')),
  add column dismissed_at timestamptz,
  add column dismissal_reason text,
  add column created_by_user_id uuid,
  add column source text not null default 'human'
    check (source in ('human', 'deterministic_rule', 'ai_suggestion'));

update public.recommended_actions action
set created_by_user_id = coalesce(
  action.owner_user_id,
  (select app_user.id from public.users app_user
    where app_user.organization_id = action.organization_id
    order by app_user.created_at limit 1)
);
update public.recommended_actions
set source = case
  when detection_key like 'ai-suggestion:%' then 'ai_suggestion'
  when detection_key is not null then 'deterministic_rule'
  else source
end;
update public.recommended_actions
set dismissed_at = coalesce(dismissed_at, updated_at),
    dismissal_reason = coalesce(nullif(trim(dismissal_reason), ''), 'Dismissed before V2 action tracking was enabled.')
where status = 'dismissed';
alter table public.recommended_actions alter column created_by_user_id set not null;
alter table public.recommended_actions
  add constraint recommended_actions_created_by_organization_fkey
  foreign key (created_by_user_id, organization_id)
  references public.users(id, organization_id) on delete restrict;

alter table public.recommended_actions
  add constraint recommended_actions_completion_check
    check (status <> 'completed' or completed_at is not null),
  add constraint recommended_actions_dismissal_check
    check (status <> 'dismissed' or (dismissed_at is not null and length(trim(dismissal_reason)) >= 3));

create index recommended_actions_organization_status_due_idx
  on public.recommended_actions (organization_id, status, due_at);
create index recommended_actions_organization_owner_status_idx
  on public.recommended_actions (organization_id, owner_user_id, status);
create index recommended_actions_organization_priority_status_idx
  on public.recommended_actions (organization_id, priority, status);
create index recommended_actions_risk_status_v2_idx
  on public.recommended_actions (risk_id, status, created_at);
