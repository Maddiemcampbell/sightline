-- Normalized Procore financial source state. This remains separate from
-- customer-entered project_financials and preserves completeness/lineage.

create table public.procore_financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  sightline_project_id uuid,
  procore_project_id text not null,
  observed_at timestamptz not null default now(),
  currency_code text not null,
  original_budget_cents bigint,
  current_budget_cents bigint,
  committed_cost_cents bigint,
  direct_cost_cents bigint,
  forecast_cost_at_completion_cents bigint,
  remaining_cost_cents bigint,
  contract_value_cents bigint,
  contingency_remaining_cents bigint,
  budget_completeness text not null check (budget_completeness in ('complete', 'partial', 'unavailable')),
  commitments_completeness text not null check (commitments_completeness in ('complete', 'partial', 'unavailable')),
  direct_costs_completeness text not null check (direct_costs_completeness in ('complete', 'partial', 'unavailable')),
  forecast_completeness text not null check (forecast_completeness in ('complete', 'partial', 'unavailable')),
  revenue_completeness text not null check (revenue_completeness in ('complete', 'partial', 'unavailable')),
  source_record_count integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (connection_id, organization_id) references public.integration_connections(id, organization_id) on delete cascade,
  foreign key (sightline_project_id, organization_id) references public.projects(id, organization_id) on delete set null
);

create table public.procore_financial_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  sightline_project_id uuid,
  procore_project_id text not null,
  external_id text not null,
  cost_code text,
  cost_type text,
  description text,
  budget_cents bigint,
  committed_cents bigint,
  direct_cost_cents bigint,
  forecast_cents bigint,
  currency_code text not null,
  external_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, connection_id, external_id),
  foreign key (connection_id, organization_id) references public.integration_connections(id, organization_id) on delete cascade,
  foreign key (sightline_project_id, organization_id) references public.projects(id, organization_id) on delete set null
);

create table public.procore_change_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  sightline_project_id uuid,
  procore_project_id text not null,
  external_id text not null,
  status text,
  title text,
  cost_impact_cents bigint,
  revenue_impact_cents bigint,
  external_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, connection_id, external_id),
  foreign key (connection_id, organization_id) references public.integration_connections(id, organization_id) on delete cascade,
  foreign key (sightline_project_id, organization_id) references public.projects(id, organization_id) on delete set null
);

create table public.procore_financial_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  sightline_project_id uuid,
  signal_type text not null,
  category_key text,
  current_value_cents bigint,
  baseline_value_cents bigint,
  exposure_cents bigint,
  exposure_percent numeric(12, 6),
  trend text check (trend is null or trend in ('improving', 'stable', 'worsening', 'unknown')),
  materiality text not null check (materiality in ('low', 'medium', 'high', 'critical')),
  confidence_score smallint check (confidence_score between 0 and 100),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  source_external_ids text[] not null default '{}',
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sightline_project_id, signal_type, category_key),
  foreign key (connection_id, organization_id) references public.integration_connections(id, organization_id) on delete cascade,
  foreign key (sightline_project_id, organization_id) references public.projects(id, organization_id) on delete set null
);

create index procore_financial_snapshots_project_idx on public.procore_financial_snapshots (organization_id, procore_project_id, observed_at desc);
create index procore_financial_line_items_project_idx on public.procore_financial_line_items (organization_id, procore_project_id, cost_code);
create index procore_change_events_project_idx on public.procore_change_events (organization_id, procore_project_id, external_updated_at desc);
create index procore_financial_signals_materiality_idx on public.procore_financial_signals (organization_id, materiality, last_observed_at desc);

create trigger procore_financial_line_items_set_updated_at before update on public.procore_financial_line_items for each row execute function public.set_updated_at();
create trigger procore_change_events_set_updated_at before update on public.procore_change_events for each row execute function public.set_updated_at();
create trigger procore_financial_signals_set_updated_at before update on public.procore_financial_signals for each row execute function public.set_updated_at();

alter table public.procore_financial_snapshots enable row level security;
alter table public.procore_financial_line_items enable row level security;
alter table public.procore_change_events enable row level security;
alter table public.procore_financial_signals enable row level security;
revoke all on public.procore_financial_snapshots, public.procore_financial_line_items, public.procore_change_events, public.procore_financial_signals from anon, authenticated;
grant all on public.procore_financial_snapshots, public.procore_financial_line_items, public.procore_change_events, public.procore_financial_signals to service_role;
