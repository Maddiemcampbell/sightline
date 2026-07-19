create type public.ai_review_status as enum ('pending', 'approved', 'rejected');

create table public.ai_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  model_name text not null,
  prompt_version text not null,
  status text not null check (status in ('complete', 'failed', 'fallback')),
  input_snapshot jsonb not null,
  output_snapshot jsonb,
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.ai_risk_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  analysis_run_id uuid not null,
  review_status public.ai_review_status not null default 'pending',
  suggested_risk jsonb not null,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_note text,
  activated_risk_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (analysis_run_id, organization_id) references public.ai_analysis_runs(id, organization_id) on delete cascade,
  foreign key (reviewed_by_user_id, organization_id) references public.users(id, organization_id) on delete set null (reviewed_by_user_id),
  foreign key (activated_risk_id, organization_id) references public.risks(id, organization_id) on delete set null (activated_risk_id),
  check (
    (review_status = 'pending' and reviewed_at is null and reviewed_by_user_id is null and activated_risk_id is null)
    or (review_status = 'rejected' and reviewed_at is not null and reviewed_by_user_id is not null and activated_risk_id is null)
    or (review_status = 'approved' and reviewed_at is not null and reviewed_by_user_id is not null and activated_risk_id is not null)
  )
);

create index ai_analysis_runs_organization_created_idx on public.ai_analysis_runs (organization_id, created_at desc);
create index ai_analysis_runs_project_created_idx on public.ai_analysis_runs (project_id, created_at desc);
create index ai_risk_suggestions_review_queue_idx on public.ai_risk_suggestions (organization_id, review_status, created_at desc);

create trigger ai_risk_suggestions_set_updated_at
before update on public.ai_risk_suggestions
for each row execute function public.set_updated_at();

alter table public.ai_analysis_runs enable row level security;
alter table public.ai_risk_suggestions enable row level security;
revoke all on table public.ai_analysis_runs, public.ai_risk_suggestions from anon, authenticated;
grant all on table public.ai_analysis_runs, public.ai_risk_suggestions to service_role;
