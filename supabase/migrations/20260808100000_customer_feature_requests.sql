-- Privacy-safe customer feature requests and staff-only product triage records.

create table public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reporting_user_id uuid not null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 10 and 10000),
  use_case text check (use_case is null or char_length(use_case) <= 10000),
  desired_outcome text check (desired_outcome is null or char_length(desired_outcome) <= 5000),
  relevant_route text check (relevant_route is null or char_length(relevant_route) <= 500),
  relevant_feature text check (relevant_feature is null or char_length(relevant_feature) <= 160),
  customer_priority text check (customer_priority is null or customer_priority in ('critical', 'high', 'medium', 'low')),
  diagnostic_consent boolean not null default false,
  application_version text not null check (char_length(application_version) <= 120),
  environment text not null check (char_length(environment) <= 80),
  browser_os text check (browser_os is null or char_length(browser_os) <= 500),
  viewport_width integer check (viewport_width is null or viewport_width between 1 and 20000),
  viewport_height integer check (viewport_height is null or viewport_height between 1 and 20000),
  correlation_id uuid not null,
  idempotency_key uuid not null,
  status text not null default 'new' check (status in ('new', 'under_review', 'planned', 'in_progress', 'released', 'declined', 'duplicate')),
  assigned_operator_id uuid references public.platform_operators(id) on delete set null,
  resolution_notes text check (resolution_notes is null or char_length(resolution_notes) <= 10000),
  related_release_id uuid references public.releases(id) on delete set null,
  external_issue_reference text check (external_issue_reference is null or char_length(external_issue_reference) <= 500),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reporting_user_id, idempotency_key),
  unique (id, organization_id),
  foreign key (reporting_user_id, organization_id) references public.users(id, organization_id) on delete restrict
);

create table public.feature_request_attachments (
  id uuid primary key default gen_random_uuid(),
  feature_request_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 10 and 1000),
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now(),
  foreign key (feature_request_id, organization_id) references public.feature_requests(id, organization_id) on delete cascade
);

create table public.feature_request_internal_notes (
  id uuid primary key default gen_random_uuid(),
  feature_request_id uuid not null references public.feature_requests(id) on delete cascade,
  operator_id uuid not null references public.platform_operators(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

create index feature_requests_triage_idx on public.feature_requests (status, customer_priority, created_at desc);
create index feature_requests_organization_date_idx on public.feature_requests (organization_id, created_at desc);
create index feature_requests_assignee_idx on public.feature_requests (assigned_operator_id, status, updated_at desc);
create index feature_request_attachments_request_idx on public.feature_request_attachments (feature_request_id, created_at);
create index feature_request_notes_request_idx on public.feature_request_internal_notes (feature_request_id, created_at desc);

create trigger feature_requests_set_updated_at before update on public.feature_requests
for each row execute function public.set_updated_at();

alter table public.feature_requests enable row level security;
alter table public.feature_request_attachments enable row level security;
alter table public.feature_request_internal_notes enable row level security;
revoke all on public.feature_requests, public.feature_request_attachments, public.feature_request_internal_notes from anon, authenticated;
grant all on public.feature_requests, public.feature_request_attachments, public.feature_request_internal_notes to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feature-request-attachments', 'feature-request-attachments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
