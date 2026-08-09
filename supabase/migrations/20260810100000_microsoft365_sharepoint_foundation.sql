-- Microsoft 365 tenant consent, SharePoint library mapping, and delta sync.

create table public.microsoft365_consent_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_user_id uuid not null,
  state_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (requested_by_user_id, organization_id)
    references public.users(id, organization_id) on delete cascade
);

create table public.microsoft365_library_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  integration_source_id uuid not null,
  site_id text not null,
  site_name text not null,
  site_url text not null,
  drive_id text not null,
  drive_name text not null,
  project_id uuid,
  selected boolean not null default false,
  delta_link text,
  last_attempted_at timestamptz,
  last_completed_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, drive_id),
  unique (id, organization_id),
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete cascade,
  foreign key (integration_source_id, organization_id)
    references public.integration_sources(id, organization_id) on delete cascade,
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete set null
);

create index microsoft365_library_mappings_sync_idx
  on public.microsoft365_library_mappings (organization_id, selected, updated_at);
create index microsoft365_consent_states_expiry_idx
  on public.microsoft365_consent_states (expires_at) where consumed_at is null;

create trigger microsoft365_library_mappings_set_updated_at
before update on public.microsoft365_library_mappings
for each row execute function public.set_updated_at();

alter table public.microsoft365_consent_states enable row level security;
alter table public.microsoft365_library_mappings enable row level security;

create policy microsoft365_library_mappings_member_select
on public.microsoft365_library_mappings for select to authenticated using (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = microsoft365_library_mappings.organization_id
      and membership.auth_user_id = auth.uid()
  )
);

revoke all on public.microsoft365_consent_states,
  public.microsoft365_library_mappings from anon;
revoke all on public.microsoft365_consent_states from authenticated;
grant select on public.microsoft365_library_mappings to authenticated;
grant all on public.microsoft365_consent_states,
  public.microsoft365_library_mappings to service_role;

alter table public.organization_job_runs
  drop constraint organization_job_runs_job_type_check;
alter table public.organization_job_runs
  add constraint organization_job_runs_job_type_check
  check (job_type in (
    'portfolio_refresh', 'daily_executive_brief', 'procore_sync',
    'microsoft365_sync'
  ));

alter table public.job_monitoring_alerts
  drop constraint job_monitoring_alerts_job_type_check;
alter table public.job_monitoring_alerts
  add constraint job_monitoring_alerts_job_type_check
  check (job_type in (
    'portfolio_refresh', 'daily_executive_brief', 'procore_sync',
    'microsoft365_sync'
  ));

create index organization_job_runs_microsoft365_queue_idx
  on public.organization_job_runs (job_type, status, created_at)
  where job_type = 'microsoft365_sync';
