-- Privacy-safe customer bug reports and staff-only triage records.

create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reporting_user_id uuid not null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 10 and 10000),
  steps_to_reproduce text check (steps_to_reproduce is null or char_length(steps_to_reproduce) <= 10000),
  expected_behavior text check (expected_behavior is null or char_length(expected_behavior) <= 5000),
  actual_behavior text check (actual_behavior is null or char_length(actual_behavior) <= 5000),
  customer_severity text check (customer_severity is null or customer_severity in (
    'blocking', 'major', 'minor', 'cosmetic'
  )),
  relevant_route text check (relevant_route is null or char_length(relevant_route) <= 500),
  relevant_feature text check (relevant_feature is null or char_length(relevant_feature) <= 160),
  diagnostic_consent boolean not null default false,
  application_version text not null check (char_length(application_version) <= 120),
  environment text not null check (char_length(environment) <= 80),
  browser_os text check (browser_os is null or char_length(browser_os) <= 500),
  viewport_width integer check (viewport_width is null or viewport_width between 1 and 20000),
  viewport_height integer check (viewport_height is null or viewport_height between 1 and 20000),
  correlation_id uuid not null,
  client_error_reference text check (
    client_error_reference is null or char_length(client_error_reference) <= 240
  ),
  idempotency_key uuid not null,
  status text not null default 'new' check (status in (
    'new', 'triaged', 'in_progress', 'resolved', 'closed',
    'duplicate', 'cannot_reproduce'
  )),
  assigned_operator_id uuid references public.platform_operators(id) on delete set null,
  resolution_notes text check (resolution_notes is null or char_length(resolution_notes) <= 10000),
  related_release_id uuid references public.releases(id) on delete set null,
  external_issue_reference text check (
    external_issue_reference is null or char_length(external_issue_reference) <= 500
  ),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reporting_user_id, idempotency_key),
  unique (id, organization_id),
  foreign key (reporting_user_id, organization_id)
    references public.users(id, organization_id) on delete restrict
);

create table public.bug_report_attachments (
  id uuid primary key default gen_random_uuid(),
  bug_report_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 10 and 1000),
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now(),
  foreign key (bug_report_id, organization_id)
    references public.bug_reports(id, organization_id) on delete cascade
);

create table public.bug_report_internal_notes (
  id uuid primary key default gen_random_uuid(),
  bug_report_id uuid not null references public.bug_reports(id) on delete cascade,
  operator_id uuid not null references public.platform_operators(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

create index bug_reports_triage_idx
  on public.bug_reports (status, customer_severity, created_at desc);
create index bug_reports_organization_date_idx
  on public.bug_reports (organization_id, created_at desc);
create index bug_reports_assignee_idx
  on public.bug_reports (assigned_operator_id, status, updated_at desc);
create index bug_report_attachments_report_idx
  on public.bug_report_attachments (bug_report_id, created_at);
create index bug_report_notes_report_idx
  on public.bug_report_internal_notes (bug_report_id, created_at desc);

create trigger bug_reports_set_updated_at before update on public.bug_reports
for each row execute function public.set_updated_at();

alter table public.bug_reports enable row level security;
alter table public.bug_report_attachments enable row level security;
alter table public.bug_report_internal_notes enable row level security;

revoke all on public.bug_reports, public.bug_report_attachments,
  public.bug_report_internal_notes from anon, authenticated;
grant all on public.bug_reports, public.bug_report_attachments,
  public.bug_report_internal_notes to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bug-report-attachments',
  'bug-report-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
