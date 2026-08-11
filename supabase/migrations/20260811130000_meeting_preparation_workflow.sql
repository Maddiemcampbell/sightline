-- Permission-aware meeting preparation, decision records, and action linkage.

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  meeting_type text not null check (meeting_type in (
    'weekly_executive_review', 'monthly_portfolio_review',
    'project_owner_meeting', 'lender_board_update', 'risk_committee_briefing'
  )),
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed')),
  starts_at timestamptz not null,
  project_ids uuid[] not null default '{}',
  agenda jsonb not null default '[]'::jsonb,
  facilitator_user_id uuid not null,
  created_by_user_id uuid not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (facilitator_user_id, organization_id)
    references public.users(id, organization_id) on delete restrict,
  foreign key (created_by_user_id, organization_id)
    references public.users(id, organization_id) on delete restrict
);

create table public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid not null,
  project_id uuid,
  risk_id uuid,
  summary text not null check (char_length(summary) between 3 and 1000),
  rationale text check (rationale is null or char_length(rationale) <= 3000),
  recorded_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (meeting_id, organization_id)
    references public.meetings(id, organization_id) on delete cascade,
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete set null,
  foreign key (risk_id, organization_id)
    references public.risks(id, organization_id) on delete set null,
  foreign key (recorded_by_user_id, organization_id)
    references public.users(id, organization_id) on delete restrict
);

create table public.meeting_follow_ups (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid not null,
  action_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (meeting_id, action_id),
  foreign key (meeting_id, organization_id)
    references public.meetings(id, organization_id) on delete cascade,
  foreign key (action_id, organization_id)
    references public.recommended_actions(id, organization_id) on delete cascade
);

create index meetings_organization_starts_idx
  on public.meetings (organization_id, starts_at desc);
create index meeting_decisions_meeting_idx
  on public.meeting_decisions (organization_id, meeting_id, created_at);
create index meeting_follow_ups_meeting_idx
  on public.meeting_follow_ups (organization_id, meeting_id, created_at);

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;
alter table public.meeting_decisions enable row level security;
alter table public.meeting_follow_ups enable row level security;

create policy meetings_member_select on public.meetings
for select to authenticated using (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = meetings.organization_id
      and membership.auth_user_id = auth.uid()
  )
);

create policy meeting_decisions_member_select on public.meeting_decisions
for select to authenticated using (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = meeting_decisions.organization_id
      and membership.auth_user_id = auth.uid()
  )
);

create policy meeting_follow_ups_member_select on public.meeting_follow_ups
for select to authenticated using (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = meeting_follow_ups.organization_id
      and membership.auth_user_id = auth.uid()
  )
);

revoke all on public.meetings, public.meeting_decisions,
  public.meeting_follow_ups from anon;
grant select on public.meetings, public.meeting_decisions,
  public.meeting_follow_ups to authenticated;
grant all on public.meetings, public.meeting_decisions,
  public.meeting_follow_ups to service_role;
