-- Authoritative project financial inputs, scheduled cash events, and compact
-- monthly portfolio snapshots. Money is stored as integer cents.

create table public.project_financials (
  project_id uuid primary key,
  organization_id uuid not null,
  currency_code text not null default 'USD'
    check (currency_code ~ '^[A-Z]{3}$'),
  original_budget_cents bigint
    check (original_budget_cents is null or original_budget_cents >= 0),
  committed_cost_cents bigint
    check (committed_cost_cents is null or committed_cost_cents >= 0),
  actual_cost_cents bigint
    check (actual_cost_cents is null or actual_cost_cents >= 0),
  forecast_cost_to_complete_cents bigint
    check (
      forecast_cost_to_complete_cents is null
      or forecast_cost_to_complete_cents >= 0
    ),
  data_as_of_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  unique (project_id, organization_id)
);

create table public.financial_change_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title text not null check (char_length(title) between 1 and 240),
  status text not null check (status in ('approved', 'pending', 'rejected')),
  amount_cents bigint not null,
  effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

create table public.financial_cash_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  direction text not null check (direction in ('inflow', 'outflow')),
  amount_cents bigint not null check (amount_cents >= 0),
  expected_date date not null,
  source_type text not null check (
    source_type in (
      'payment_schedule', 'invoice', 'commitment', 'forecast', 'manual'
    )
  ),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  description text not null check (char_length(description) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

create table public.portfolio_financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_month date not null check (
    snapshot_month = date_trunc('month', snapshot_month)::date
  ),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  active_projects integer not null check (active_projects >= 0),
  portfolio_budget_cents bigint,
  forecast_cost_cents bigint,
  net_budget_variance_cents bigint,
  projects_over_budget integer not null check (projects_over_budget >= 0),
  projects_under_budget integer not null check (projects_under_budget >= 0),
  projects_missing_financial_data integer not null
    check (projects_missing_financial_data >= 0),
  completeness text not null check (
    completeness in ('complete', 'partial', 'estimated', 'missing', 'unavailable')
  ),
  project_metrics jsonb not null default '[]'::jsonb,
  calculation_version text not null,
  calculated_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (organization_id, snapshot_month)
);

create index financial_change_orders_project_idx
  on public.financial_change_orders (organization_id, project_id, status);
create index financial_cash_events_date_idx
  on public.financial_cash_events (organization_id, expected_date, project_id);
create index portfolio_financial_snapshots_month_idx
  on public.portfolio_financial_snapshots (organization_id, snapshot_month desc);

create trigger project_financials_set_updated_at
  before update on public.project_financials
  for each row execute function public.set_updated_at();
create trigger financial_change_orders_set_updated_at
  before update on public.financial_change_orders
  for each row execute function public.set_updated_at();
create trigger financial_cash_events_set_updated_at
  before update on public.financial_cash_events
  for each row execute function public.set_updated_at();

alter table public.project_financials enable row level security;
alter table public.financial_change_orders enable row level security;
alter table public.financial_cash_events enable row level security;
alter table public.portfolio_financial_snapshots enable row level security;

create policy project_financials_owner_select
  on public.project_financials for select to authenticated
  using (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy financial_change_orders_owner_select
  on public.financial_change_orders for select to authenticated
  using (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy financial_cash_events_owner_select
  on public.financial_cash_events for select to authenticated
  using (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy portfolio_financial_snapshots_owner_select
  on public.portfolio_financial_snapshots for select to authenticated
  using ((select public.current_organization_role(organization_id)) = 'owner');

create policy project_financials_owner_insert
  on public.project_financials for insert to authenticated
  with check (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy project_financials_owner_update
  on public.project_financials for update to authenticated
  using ((select public.current_organization_role(organization_id)) = 'owner')
  with check (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy project_financials_owner_delete
  on public.project_financials for delete to authenticated
  using ((select public.current_organization_role(organization_id)) = 'owner');

create policy financial_change_orders_owner_insert
  on public.financial_change_orders for insert to authenticated
  with check (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy financial_change_orders_owner_update
  on public.financial_change_orders for update to authenticated
  using ((select public.current_organization_role(organization_id)) = 'owner')
  with check (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy financial_change_orders_owner_delete
  on public.financial_change_orders for delete to authenticated
  using ((select public.current_organization_role(organization_id)) = 'owner');

create policy financial_cash_events_owner_insert
  on public.financial_cash_events for insert to authenticated
  with check (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy financial_cash_events_owner_update
  on public.financial_cash_events for update to authenticated
  using ((select public.current_organization_role(organization_id)) = 'owner')
  with check (
    (select public.current_organization_role(organization_id)) = 'owner'
    and (select public.can_access_project(organization_id, project_id))
  );
create policy financial_cash_events_owner_delete
  on public.financial_cash_events for delete to authenticated
  using ((select public.current_organization_role(organization_id)) = 'owner');

revoke all on public.project_financials, public.financial_change_orders,
  public.financial_cash_events, public.portfolio_financial_snapshots
  from anon, authenticated;
grant select, insert, update, delete on public.project_financials,
  public.financial_change_orders, public.financial_cash_events to authenticated;
grant select on public.portfolio_financial_snapshots to authenticated;
grant all on public.project_financials, public.financial_change_orders,
  public.financial_cash_events, public.portfolio_financial_snapshots to service_role;

comment on table public.project_financials is
  'Authoritative project-level financial inputs. Null means unknown, never zero.';
comment on table public.portfolio_financial_snapshots is
  'Compact monthly derived portfolio metrics for explainable historical comparison.';
