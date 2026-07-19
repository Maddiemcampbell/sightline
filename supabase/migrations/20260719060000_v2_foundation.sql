alter table public.recommended_actions
  add column priority text not null default 'normal'
  check (priority in ('low', 'normal', 'high', 'urgent'));

create index recommended_actions_organization_owner_status_idx
  on public.recommended_actions (organization_id, assigned_user_id, status);

create index recommended_actions_organization_priority_due_idx
  on public.recommended_actions (organization_id, priority, due_at)
  where status in ('open', 'in_progress');

create table public.risk_resolutions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  resolved_by_user_id uuid not null,
  resolution_type text not null
    check (resolution_type in ('mitigated', 'avoided', 'accepted', 'realized', 'unknown')),
  summary text not null check (char_length(summary) between 3 and 3000),
  realized_impact_cents bigint
    check (realized_impact_cents is null or realized_impact_cents >= 0),
  resolved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (risk_id, organization_id)
    references public.risks(id, organization_id) on delete cascade,
  foreign key (resolved_by_user_id, organization_id)
    references public.users(id, organization_id) on delete restrict
);

create index risk_resolutions_organization_risk_resolved_idx
  on public.risk_resolutions (organization_id, risk_id, resolved_at desc);

alter table public.risk_resolutions enable row level security;
revoke all on table public.risk_resolutions from anon, authenticated;
grant all on table public.risk_resolutions to service_role;
