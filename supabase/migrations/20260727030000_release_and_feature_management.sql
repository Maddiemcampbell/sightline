-- Staff-only feature controls and verified release metadata.

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null unique check (flag_key ~ '^[a-z][a-z0-9._-]{2,79}$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  enabled boolean not null default false,
  default_enabled boolean not null default false,
  environments text[] not null default '{}',
  organization_ids uuid[] not null default '{}',
  user_ids uuid[] not null default '{}',
  rollout_percentage smallint not null default 100
    check (rollout_percentage between 0 and 100),
  created_by_operator_id uuid references public.platform_operators(id) on delete set null,
  updated_by_operator_id uuid references public.platform_operators(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feature_flag_changes (
  id uuid primary key default gen_random_uuid(),
  feature_flag_id uuid not null references public.feature_flags(id) on delete cascade,
  operator_id uuid not null references public.platform_operators(id),
  change_type text not null check (change_type in ('created', 'updated', 'enabled', 'disabled')),
  previous_state jsonb,
  new_state jsonb not null,
  created_at timestamptz not null default now()
);

create table public.feature_flag_evaluation_logs (
  id uuid primary key default gen_random_uuid(),
  feature_flag_id uuid references public.feature_flags(id) on delete cascade,
  flag_key text not null,
  environment text not null,
  organization_id uuid,
  user_id uuid,
  result boolean not null,
  reason text not null,
  correlation_id uuid,
  created_at timestamptz not null default now()
);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  release_identifier text not null unique check (
    char_length(release_identifier) between 2 and 120
  ),
  application_version text not null check (
    char_length(application_version) between 1 and 120
  ),
  environment text not null check (char_length(environment) between 1 and 80),
  status text not null check (status in (
    'planned', 'deploying', 'deployed', 'failed', 'rolled_back'
  )),
  deployed_at timestamptz,
  commit_sha text check (commit_sha is null or char_length(commit_sha) <= 80),
  source_reference text check (
    source_reference is null or char_length(source_reference) <= 240
  ),
  deployed_by text check (deployed_by is null or char_length(deployed_by) <= 160),
  release_notes text not null default '' check (char_length(release_notes) <= 10000),
  rollback_status text not null default 'not_rolled_back' check (
    rollback_status in ('not_rolled_back', 'rollback_pending', 'rolled_back')
  ),
  created_by_operator_id uuid references public.platform_operators(id) on delete set null,
  updated_by_operator_id uuid references public.platform_operators(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.release_feature_flags (
  release_id uuid not null references public.releases(id) on delete cascade,
  feature_flag_id uuid not null references public.feature_flags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (release_id, feature_flag_id)
);

create index feature_flags_status_environment_idx
  on public.feature_flags (enabled, updated_at desc);
create index feature_flag_changes_history_idx
  on public.feature_flag_changes (feature_flag_id, created_at desc);
create index feature_flag_evaluations_debug_idx
  on public.feature_flag_evaluation_logs (flag_key, created_at desc);
create index releases_environment_status_date_idx
  on public.releases (environment, status, deployed_at desc nulls last);
create index releases_recent_idx
  on public.releases (coalesce(deployed_at, created_at) desc);

create trigger feature_flags_set_updated_at before update on public.feature_flags
for each row execute function public.set_updated_at();
create trigger releases_set_updated_at before update on public.releases
for each row execute function public.set_updated_at();

alter table public.feature_flags enable row level security;
alter table public.feature_flag_changes enable row level security;
alter table public.feature_flag_evaluation_logs enable row level security;
alter table public.releases enable row level security;
alter table public.release_feature_flags enable row level security;

-- Service-role reads follow application permission checks. No customer role
-- receives direct access to flag targeting or release metadata.
revoke all on public.feature_flags, public.feature_flag_changes,
  public.feature_flag_evaluation_logs, public.releases,
  public.release_feature_flags from anon, authenticated;
grant all on public.feature_flags, public.feature_flag_changes,
  public.feature_flag_evaluation_logs, public.releases,
  public.release_feature_flags to service_role;
