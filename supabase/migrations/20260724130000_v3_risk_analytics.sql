alter table public.risks
  add column normalized_category_id text,
  add column category_mapping_source text,
  add column category_mapping_confidence smallint,
  add column taxonomy_version text,
  add column financial_exposure_assessed boolean not null default false,
  add column last_assessed_at timestamptz,
  add constraint risks_mapping_confidence_check
    check (category_mapping_confidence is null or category_mapping_confidence between 0 and 100),
  add constraint risks_mapping_source_check
    check (category_mapping_source is null or category_mapping_source in
      ('manual','structured','exact_alias','rule','unmapped'));

comment on column public.risks.financial_exposure_assessed is
  'True only when potential_exposure_cents was explicitly assessed. False means not assessed, not zero.';
comment on column public.risks.normalized_category_id is
  'Optional taxonomy override; original category remains authoritative source data.';

create index risks_organization_normalized_category_idx
  on public.risks (organization_id, normalized_category_id, status);

create table public.portfolio_risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_month date not null,
  analytics_payload jsonb not null,
  calculation_version text not null,
  taxonomy_version text not null,
  ranking_version text not null,
  data_quality text not null check (data_quality in ('complete','partial','not_assessed','unavailable')),
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, snapshot_month),
  check (snapshot_month = date_trunc('month', snapshot_month)::date)
);

alter table public.portfolio_risk_snapshots enable row level security;
create policy portfolio_risk_snapshots_owner_select
  on public.portfolio_risk_snapshots for select to authenticated
  using ((select public.current_organization_role(organization_id)) = 'owner');
create policy portfolio_risk_snapshots_service_all
  on public.portfolio_risk_snapshots for all to service_role
  using (true) with check (true);

revoke insert, update, delete on public.portfolio_risk_snapshots from authenticated;
grant select on public.portfolio_risk_snapshots to authenticated;
grant all on public.portfolio_risk_snapshots to service_role;
