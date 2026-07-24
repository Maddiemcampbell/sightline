-- Deterministic portfolio observations and tenant-owned risk memory graph.

create table public.portfolio_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  observation_key text not null,
  observation_type text not null check (observation_type in (
    'documentation_gap', 'vendor_concentration', 'recurring_risk',
    'overdue_actions'
  )),
  title text not null check (char_length(title) between 1 and 240),
  summary text not null check (char_length(summary) between 1 and 2000),
  supporting_evidence jsonb not null default '[]'::jsonb,
  confidence_score smallint not null check (confidence_score between 0 and 100),
  affected_project_ids uuid[] not null default '{}'::uuid[],
  business_impact_estimate_cents bigint
    check (business_impact_estimate_cents is null or business_impact_estimate_cents >= 0),
  business_impact_explanation text not null check (char_length(business_impact_explanation) between 1 and 1000),
  recommended_next_step text not null check (char_length(recommended_next_step) between 1 and 1000),
  algorithm_version text not null,
  status text not null default 'active' check (status in ('active', 'superseded')),
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, observation_key),
  unique (id, organization_id)
);

create table public.risk_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_risk_id uuid not null,
  target_risk_id uuid not null,
  relationship_type text not null check (relationship_type in (
    'duplicate', 'caused_by', 'contributes_to', 'blocks', 'same_vendor',
    'same_subcontractor', 'same_document', 'same_project_phase',
    'same_root_cause'
  )),
  confidence_score smallint not null check (confidence_score between 0 and 100),
  supporting_evidence jsonb not null default '[]'::jsonb,
  source text not null default 'deterministic'
    check (source in ('deterministic', 'human')),
  algorithm_version text not null,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_risk_id, organization_id)
    references public.risks(id, organization_id) on delete cascade,
  foreign key (target_risk_id, organization_id)
    references public.risks(id, organization_id) on delete cascade,
  foreign key (created_by_user_id, organization_id)
    references public.users(id, organization_id) on delete set null,
  check (source_risk_id <> target_risk_id),
  unique (organization_id, source_risk_id, target_risk_id, relationship_type)
);

create index portfolio_observations_active_idx
  on public.portfolio_observations (organization_id, last_observed_at desc)
  where status = 'active';
create index risk_relationships_source_idx
  on public.risk_relationships (organization_id, source_risk_id, relationship_type);
create index risk_relationships_target_idx
  on public.risk_relationships (organization_id, target_risk_id, relationship_type);

create trigger portfolio_observations_set_updated_at
  before update on public.portfolio_observations
  for each row execute function public.set_updated_at();
create trigger risk_relationships_set_updated_at
  before update on public.risk_relationships
  for each row execute function public.set_updated_at();

alter table public.portfolio_observations enable row level security;
alter table public.risk_relationships enable row level security;

create policy portfolio_observations_leadership_select
  on public.portfolio_observations for select to authenticated
  using ((select public.current_organization_role(organization_id)) in ('owner', 'administrator'));

create policy risk_relationships_project_select
  on public.risk_relationships for select to authenticated
  using (
    exists (
      select 1
      from public.risks source_risk
      join public.risks target_risk
        on target_risk.id = risk_relationships.target_risk_id
       and target_risk.organization_id = risk_relationships.organization_id
      where source_risk.id = risk_relationships.source_risk_id
        and source_risk.organization_id = risk_relationships.organization_id
        and (
          source_risk.project_id is null
          or (
            select public.can_access_project(
              risk_relationships.organization_id,
              source_risk.project_id
            )
          )
        )
        and (
          target_risk.project_id is null
          or (
            select public.can_access_project(
              risk_relationships.organization_id,
              target_risk.project_id
            )
          )
        )
    )
  );

revoke all on public.portfolio_observations, public.risk_relationships
  from anon, authenticated;
grant select on public.portfolio_observations, public.risk_relationships
  to authenticated;
grant all on public.portfolio_observations, public.risk_relationships
  to service_role;

comment on table public.portfolio_observations is
  'Explainable deterministic portfolio patterns. Never stores model-generated guesses.';
comment on table public.risk_relationships is
  'Tenant-owned risk memory graph with deterministic or human-authored edges.';
