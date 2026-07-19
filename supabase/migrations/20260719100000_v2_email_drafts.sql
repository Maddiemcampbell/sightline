alter table public.risk_activities drop constraint risk_activities_type_check;
alter table public.risk_activities add constraint risk_activities_type_check
  check (activity_type in (
    'risk_detected', 'risk_acknowledged', 'risk_updated', 'status_changed',
    'severity_changed', 'owner_assigned', 'due_date_changed', 'action_suggested',
    'action_accepted', 'action_started', 'action_completed', 'action_dismissed',
    'evidence_added', 'document_uploaded', 'email_drafted', 'email_marked_sent',
    'comment_added', 'risk_resolved', 'risk_reopened', 'system_analysis_completed',
    'created', 'assigned', 'commented', 'action_updated', 'resolved', 'dismissed'
  ));

create table public.risk_email_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  recommended_action_id uuid,
  created_by_user_id uuid not null,
  recipient_user_id uuid,
  recipient_vendor_id uuid,
  recipient_name text,
  recipient_email text,
  intended_recipient_role text not null check (char_length(intended_recipient_role) between 2 and 120),
  desired_tone text not null check (desired_tone in ('concise', 'collaborative', 'firm', 'formal')),
  suggested_urgency text not null check (suggested_urgency in ('routine', 'soon', 'urgent')),
  subject text not null check (char_length(subject) between 1 and 240),
  body text not null check (char_length(body) between 1 and 10000),
  evidence_ids uuid[] not null default '{}'::uuid[],
  generation_source text not null check (generation_source in ('ai', 'deterministic_fallback')),
  provider text not null,
  model_name text not null,
  prompt_version text not null,
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  status text not null default 'draft' check (status in ('draft', 'manually_sent')),
  manually_sent_at timestamptz,
  manually_sent_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (risk_id, organization_id) references public.risks(id, organization_id) on delete cascade,
  foreign key (recommended_action_id, organization_id) references public.recommended_actions(id, organization_id) on delete set null (recommended_action_id),
  foreign key (created_by_user_id, organization_id) references public.users(id, organization_id) on delete restrict,
  foreign key (recipient_user_id, organization_id) references public.users(id, organization_id) on delete set null,
  foreign key (recipient_vendor_id, organization_id) references public.vendors(id, organization_id) on delete set null,
  foreign key (manually_sent_by_user_id, organization_id) references public.users(id, organization_id) on delete restrict,
  check (
    (status = 'draft' and manually_sent_at is null and manually_sent_by_user_id is null)
    or (status = 'manually_sent' and manually_sent_at is not null and manually_sent_by_user_id is not null)
  )
);

create index risk_email_drafts_risk_created_idx
  on public.risk_email_drafts (organization_id, risk_id, created_at desc);
create index risk_email_drafts_status_idx
  on public.risk_email_drafts (organization_id, status, updated_at desc);

create trigger risk_email_drafts_set_updated_at
before update on public.risk_email_drafts
for each row execute function public.set_updated_at();

alter table public.risk_email_drafts enable row level security;
revoke all on table public.risk_email_drafts from anon, authenticated;
grant all on table public.risk_email_drafts to service_role;
