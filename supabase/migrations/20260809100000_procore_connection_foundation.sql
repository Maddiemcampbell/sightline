-- Procore connection, project mapping, synchronization state, and provenance.
-- Credentials are ciphertext and are only accessible through the service role.

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.integration_provider not null,
  company_id text not null check (char_length(company_id) between 1 and 80),
  company_name text not null check (char_length(company_name) between 1 and 240),
  environment text not null check (environment in ('sandbox', 'production')),
  status text not null default 'pending' check (status in (
    'pending', 'active', 'degraded', 'permission_error',
    'authentication_error', 'sync_error', 'disconnected'
  )),
  installation_reference text,
  last_attempted_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  current_error text check (current_error is null or char_length(current_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider),
  unique (id, organization_id)
);

create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  credential_type text not null default 'procore_dmsa_client_credentials'
    check (credential_type = 'procore_dmsa_client_credentials'),
  encrypted_client_id text not null,
  encrypted_client_secret text not null,
  encryption_key_version text not null default 'v1',
  rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete cascade
);

create table public.integration_project_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  sightline_project_id uuid,
  procore_company_id text not null,
  procore_project_id text not null,
  procore_project_name text not null,
  procore_project_number text,
  mapping_status text not null default 'suggested' check (mapping_status in (
    'suggested', 'mapped', 'created', 'skipped', 'unmapped'
  )),
  mapping_method text not null default 'manual' check (mapping_method in (
    'existing_external_mapping', 'exact_number', 'exact_name', 'normalized_name', 'manual', 'created', 'skipped'
  )),
  approved_by_user_id uuid,
  last_discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, procore_project_id),
  unique (organization_id, procore_company_id, procore_project_id),
  unique (sightline_project_id, connection_id),
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete cascade,
  foreign key (sightline_project_id, organization_id)
    references public.projects(id, organization_id) on delete set null,
  foreign key (approved_by_user_id, organization_id)
    references public.users(id, organization_id) on delete set null
);

create table public.integration_sync_cursors (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_type text not null check (resource_type in (
    'companies', 'projects', 'budgets', 'budget_rows', 'commitments',
    'direct_costs', 'changes', 'change_events', 'rfis', 'submittals', 'documents'
  )),
  cursor text,
  high_water_mark timestamptz,
  last_attempted_at timestamptz,
  last_completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, resource_type),
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete cascade
);

create table public.integration_external_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  provider public.integration_provider not null,
  resource_type text not null,
  external_id text not null,
  procore_project_id text,
  sightline_project_id uuid,
  sightline_record_id uuid,
  external_updated_at timestamptz,
  source_url text,
  content_checksum text,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, resource_type, external_id),
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete cascade,
  foreign key (sightline_project_id, organization_id)
    references public.projects(id, organization_id) on delete set null
);

create index integration_connections_org_status_idx
  on public.integration_connections (organization_id, status, updated_at desc);
create index integration_project_mappings_org_status_idx
  on public.integration_project_mappings (organization_id, mapping_status, updated_at desc);
create index integration_external_records_project_resource_idx
  on public.integration_external_records (organization_id, procore_project_id, resource_type, last_observed_at desc);

create trigger integration_connections_set_updated_at before update on public.integration_connections
for each row execute function public.set_updated_at();
create trigger integration_credentials_set_updated_at before update on public.integration_credentials
for each row execute function public.set_updated_at();
create trigger integration_project_mappings_set_updated_at before update on public.integration_project_mappings
for each row execute function public.set_updated_at();
create trigger integration_sync_cursors_set_updated_at before update on public.integration_sync_cursors
for each row execute function public.set_updated_at();
create trigger integration_external_records_set_updated_at before update on public.integration_external_records
for each row execute function public.set_updated_at();

alter table public.integration_connections enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.integration_project_mappings enable row level security;
alter table public.integration_sync_cursors enable row level security;
alter table public.integration_external_records enable row level security;

create policy integration_connections_owner_select on public.integration_connections
for select to authenticated using (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = integration_connections.organization_id
      and membership.auth_user_id = auth.uid()
  )
);
create policy integration_project_mappings_owner_select on public.integration_project_mappings
for select to authenticated using (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = integration_project_mappings.organization_id
      and membership.auth_user_id = auth.uid()
  )
);

revoke all on public.integration_connections, public.integration_credentials,
  public.integration_project_mappings, public.integration_sync_cursors,
  public.integration_external_records from anon;
revoke all on public.integration_credentials, public.integration_sync_cursors,
  public.integration_external_records from authenticated;
grant select on public.integration_connections, public.integration_project_mappings to authenticated;
grant all on public.integration_connections, public.integration_credentials,
  public.integration_project_mappings, public.integration_sync_cursors,
  public.integration_external_records to service_role;
