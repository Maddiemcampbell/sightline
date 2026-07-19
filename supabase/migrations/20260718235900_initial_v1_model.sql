create extension if not exists pgcrypto;

create type public.user_role as enum ('executive', 'operations', 'project_manager', 'admin');
create type public.project_status as enum ('planning', 'active', 'on_hold', 'complete', 'cancelled');
create type public.document_type as enum ('contract', 'insurance', 'daily_log', 'schedule', 'change_order', 'safety', 'financial', 'other');
create type public.risk_category as enum ('insurance', 'schedule', 'documentation', 'contract', 'safety', 'financial', 'vendor', 'weather', 'other');
create type public.risk_severity as enum ('low', 'medium', 'high', 'critical');
create type public.risk_status as enum ('monitoring', 'action_needed', 'in_progress', 'resolved', 'dismissed');
create type public.action_status as enum ('open', 'in_progress', 'complete', 'dismissed');
create type public.brief_status as enum ('draft', 'published');
create type public.activity_type as enum ('created', 'status_changed', 'assigned', 'commented', 'evidence_added', 'action_updated', 'resolved', 'dismissed');
create type public.integration_provider as enum ('manual', 'procore', 'autodesk', 'email', 'sharepoint', 'other');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, slug)
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  full_name text not null check (char_length(full_name) between 1 and 160),
  title text,
  role public.user_role not null default 'operations',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email),
  unique (id, organization_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  project_number text not null,
  status public.project_status not null default 'active',
  address_line_1 text,
  city text,
  state_code text check (state_code is null or char_length(state_code) = 2),
  postal_code text,
  contract_value_cents bigint check (contract_value_cents is null or contract_value_cents >= 0),
  start_date date,
  target_completion_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_number),
  unique (id, organization_id)
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  trade text,
  contact_name text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (id, organization_id)
);

create table public.project_vendors (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  vendor_id uuid not null,
  scope_of_work text,
  created_at timestamptz not null default now(),
  primary key (project_id, vendor_id),
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  foreign key (vendor_id, organization_id) references public.vendors(id, organization_id) on delete cascade
);

create table public.integration_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.integration_provider not null default 'manual',
  name text not null check (char_length(name) between 1 and 160),
  external_account_id text,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, name),
  unique (id, organization_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  vendor_id uuid,
  integration_source_id uuid,
  name text not null check (char_length(name) between 1 and 240),
  document_type public.document_type not null default 'other',
  storage_path text,
  external_id text,
  document_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  foreign key (vendor_id, organization_id) references public.vendors(id, organization_id) on delete set null (vendor_id),
  foreign key (integration_source_id, organization_id) references public.integration_sources(id, organization_id) on delete set null (integration_source_id)
);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  vendor_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  summary text not null check (char_length(summary) between 1 and 2000),
  category public.risk_category not null,
  severity public.risk_severity not null,
  status public.risk_status not null default 'monitoring',
  potential_exposure_cents bigint not null default 0 check (potential_exposure_cents >= 0),
  estimated_margin_impact_cents bigint not null default 0 check (estimated_margin_impact_cents >= 0),
  confidence_score smallint not null check (confidence_score between 0 and 100),
  why_it_matters text not null check (char_length(why_it_matters) between 1 and 3000),
  detected_at timestamptz not null,
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  foreign key (vendor_id, organization_id) references public.vendors(id, organization_id) on delete set null (vendor_id),
  check ((status = 'resolved' and resolved_at is not null) or status <> 'resolved'),
  check (resolved_at is null or resolved_at >= detected_at)
);

create table public.risk_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  document_id uuid,
  integration_source_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  description text not null check (char_length(description) between 1 and 3000),
  source_excerpt text,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (risk_id, organization_id) references public.risks(id, organization_id) on delete cascade,
  foreign key (document_id, organization_id) references public.documents(id, organization_id) on delete set null (document_id),
  foreign key (integration_source_id, organization_id) references public.integration_sources(id, organization_id) on delete set null (integration_source_id)
);

create table public.recommended_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  assigned_user_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  description text not null check (char_length(description) between 1 and 2000),
  status public.action_status not null default 'open',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (risk_id, organization_id) references public.risks(id, organization_id) on delete cascade,
  foreign key (assigned_user_id, organization_id) references public.users(id, organization_id) on delete set null (assigned_user_id),
  check ((status = 'complete' and completed_at is not null) or status <> 'complete')
);

create table public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brief_date date not null,
  status public.brief_status not null default 'draft',
  headline text not null check (char_length(headline) between 1 and 240),
  introduction text not null check (char_length(introduction) between 1 and 2000),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, brief_date),
  unique (id, organization_id),
  check ((status = 'published' and published_at is not null) or status = 'draft')
);

create table public.brief_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  daily_brief_id uuid not null,
  risk_id uuid not null,
  priority smallint not null check (priority between 1 and 3),
  headline text not null check (char_length(headline) between 1 and 240),
  summary text not null check (char_length(summary) between 1 and 2000),
  recommended_next_step text not null check (char_length(recommended_next_step) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (daily_brief_id, priority),
  unique (daily_brief_id, risk_id),
  foreign key (daily_brief_id, organization_id) references public.daily_briefs(id, organization_id) on delete cascade,
  foreign key (risk_id, organization_id) references public.risks(id, organization_id) on delete restrict
);

create table public.risk_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  actor_user_id uuid,
  activity_type public.activity_type not null,
  from_status public.risk_status,
  to_status public.risk_status,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (risk_id, organization_id) references public.risks(id, organization_id) on delete cascade,
  foreign key (actor_user_id, organization_id) references public.users(id, organization_id) on delete set null (actor_user_id),
  check (
    activity_type <> 'status_changed'
    or (from_status is not null and to_status is not null and from_status <> to_status)
  )
);

create index users_organization_idx on public.users (organization_id);
create index projects_organization_status_idx on public.projects (organization_id, status);
create index projects_organization_completion_idx on public.projects (organization_id, target_completion_date);
create index vendors_organization_idx on public.vendors (organization_id);
create index project_vendors_organization_vendor_idx on public.project_vendors (organization_id, vendor_id);
create index documents_organization_project_date_idx on public.documents (organization_id, project_id, document_date desc);
create index documents_organization_type_idx on public.documents (organization_id, document_type);
create index risks_organization_status_idx on public.risks (organization_id, status);
create index risks_organization_project_status_idx on public.risks (organization_id, project_id, status);
create index risks_organization_vendor_status_idx on public.risks (organization_id, vendor_id, status);
create index risks_organization_detected_idx on public.risks (organization_id, detected_at desc);
create index risks_organization_due_idx on public.risks (organization_id, due_at) where due_at is not null and status not in ('resolved', 'dismissed');
create index risks_active_priority_idx on public.risks (organization_id, severity, potential_exposure_cents desc, confidence_score desc) where status not in ('resolved', 'dismissed');
create index risk_evidence_risk_observed_idx on public.risk_evidence (risk_id, observed_at desc);
create index recommended_actions_risk_status_idx on public.recommended_actions (risk_id, status);
create index recommended_actions_organization_due_idx on public.recommended_actions (organization_id, due_at) where status in ('open', 'in_progress');
create index daily_briefs_organization_date_idx on public.daily_briefs (organization_id, brief_date desc);
create index brief_items_risk_idx on public.brief_items (risk_id);
create index risk_activities_risk_occurred_idx on public.risk_activities (risk_id, occurred_at desc);
create index risk_activities_organization_occurred_idx on public.risk_activities (organization_id, occurred_at desc);
create index integration_sources_organization_active_idx on public.integration_sources (organization_id, is_active);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger vendors_set_updated_at before update on public.vendors for each row execute function public.set_updated_at();
create trigger integration_sources_set_updated_at before update on public.integration_sources for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger risks_set_updated_at before update on public.risks for each row execute function public.set_updated_at();
create trigger recommended_actions_set_updated_at before update on public.recommended_actions for each row execute function public.set_updated_at();
create trigger daily_briefs_set_updated_at before update on public.daily_briefs for each row execute function public.set_updated_at();

create function public.enforce_published_brief_item_count()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_brief_id uuid;
  brief_is_published boolean;
  item_count integer;
begin
  target_brief_id := case when tg_op = 'DELETE' then old.daily_brief_id else new.daily_brief_id end;

  select status = 'published'
    into brief_is_published
    from public.daily_briefs
    where id = target_brief_id;

  if coalesce(brief_is_published, false) then
    select count(*) into item_count from public.brief_items where daily_brief_id = target_brief_id;
    if item_count <> 3 then
      raise exception 'Published daily brief % must contain exactly 3 items; found %', target_brief_id, item_count;
    end if;
  end if;

  return null;
end;
$$;

create constraint trigger brief_items_enforce_published_count
after insert or update or delete on public.brief_items
deferrable initially deferred
for each row execute function public.enforce_published_brief_item_count();

create function public.enforce_brief_publish_item_count()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  item_count integer;
begin
  if new.status = 'published' then
    select count(*) into item_count from public.brief_items where daily_brief_id = new.id;
    if item_count <> 3 then
      raise exception 'Published daily brief % must contain exactly 3 items; found %', new.id, item_count;
    end if;
  end if;
  return null;
end;
$$;

create constraint trigger daily_briefs_enforce_published_count
after insert or update on public.daily_briefs
deferrable initially deferred
for each row execute function public.enforce_brief_publish_item_count();

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.vendors enable row level security;
alter table public.project_vendors enable row level security;
alter table public.integration_sources enable row level security;
alter table public.documents enable row level security;
alter table public.risks enable row level security;
alter table public.risk_evidence enable row level security;
alter table public.recommended_actions enable row level security;
alter table public.daily_briefs enable row level security;
alter table public.brief_items enable row level security;
alter table public.risk_activities enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage on schema public to service_role;
