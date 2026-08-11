-- Human-controlled commitment tracking for outbound risk communications.

create table public.commitment_follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  email_draft_id uuid not null,
  recommended_action_id uuid,
  owner_user_id uuid not null,
  requested_commitment text not null check (char_length(requested_commitment) between 3 and 1000),
  expected_response_at timestamptz not null,
  status text not null default 'awaiting_response' check (status in ('awaiting_response', 'response_received', 'resolved')),
  response_evidence_id uuid,
  response_note text check (response_note is null or char_length(response_note) <= 2000),
  response_received_at timestamptz,
  verified_at timestamptz,
  verified_by_user_id uuid,
  last_reminded_at timestamptz,
  reminder_count integer not null default 0 check (reminder_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (email_draft_id),
  foreign key (risk_id, organization_id) references public.risks(id, organization_id) on delete cascade,
  foreign key (email_draft_id, organization_id) references public.risk_email_drafts(id, organization_id) on delete cascade,
  foreign key (recommended_action_id, organization_id) references public.recommended_actions(id, organization_id) on delete set null (recommended_action_id),
  foreign key (owner_user_id, organization_id) references public.users(id, organization_id) on delete restrict,
  foreign key (response_evidence_id, organization_id) references public.risk_evidence(id, organization_id) on delete restrict,
  foreign key (verified_by_user_id, organization_id) references public.users(id, organization_id) on delete restrict,
  check (
    (status = 'awaiting_response' and response_received_at is null and verified_at is null and verified_by_user_id is null)
    or (status = 'response_received' and response_received_at is not null and verified_at is null and verified_by_user_id is null)
    or (status = 'resolved' and response_received_at is not null and verified_at is not null and verified_by_user_id is not null)
  ),
  check (response_evidence_id is null or response_received_at is not null)
);

create index commitment_follow_ups_owner_due_idx
  on public.commitment_follow_ups (organization_id, owner_user_id, expected_response_at)
  where status = 'awaiting_response';
create index commitment_follow_ups_risk_idx
  on public.commitment_follow_ups (organization_id, risk_id, created_at desc);

create trigger commitment_follow_ups_set_updated_at before update on public.commitment_follow_ups
for each row execute function public.set_updated_at();

alter table public.commitment_follow_ups enable row level security;
revoke all on public.commitment_follow_ups from anon, authenticated;
create policy commitment_follow_ups_project_select on public.commitment_follow_ups
for select to authenticated using (
  exists (
    select 1 from public.risks risk
    where risk.id = risk_id
      and risk.organization_id = organization_id
      and risk.project_id is not null
      and public.can_access_project(organization_id, risk.project_id)
  )
);
create policy commitment_follow_ups_member_insert on public.commitment_follow_ups
for insert to authenticated with check (public.is_organization_member(organization_id));
create policy commitment_follow_ups_member_update on public.commitment_follow_ups
for update to authenticated using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));
grant select, insert, update on public.commitment_follow_ups to authenticated;
grant all on public.commitment_follow_ups to service_role;

alter table public.risk_activities drop constraint risk_activities_type_check;
alter table public.risk_activities add constraint risk_activities_type_check
  check (activity_type in (
    'risk_detected', 'risk_acknowledged', 'risk_updated', 'status_changed',
    'severity_changed', 'owner_assigned', 'due_date_changed', 'action_suggested',
    'action_accepted', 'action_started', 'action_completed', 'action_dismissed',
    'evidence_added', 'document_uploaded', 'email_drafted', 'email_marked_sent',
    'commitment_tracked', 'commitment_response_received', 'commitment_resolved',
    'commitment_reminder_created', 'comment_added', 'risk_resolved', 'risk_reopened',
    'system_analysis_completed', 'created', 'assigned', 'commented',
    'action_updated', 'resolved', 'dismissed'
  ));

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (notification_type in (
    'mention', 'assignment', 'role_change', 'invitation', 'project_added',
    'risk_assigned', 'action_completed', 'data_export_ready',
    'data_export_failed', 'background_job_failed', 'exception_alert',
    'commitment_follow_up'
  ));

comment on table public.commitment_follow_ups is
  'Tracks a requested external commitment from a manually sent email through evidence-backed verification.';
