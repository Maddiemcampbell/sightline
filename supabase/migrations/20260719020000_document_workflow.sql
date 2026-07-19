alter type public.document_type add value if not exists 'rfi';
alter type public.document_type add value if not exists 'incident_report';

create type public.document_processing_status as enum (
  'pending',
  'ready',
  'failed'
);

alter table public.documents
  add column original_filename text,
  add column mime_type text,
  add column size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  add column processing_status public.document_processing_status not null default 'pending',
  add column archived_at timestamptz;

create table public.document_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null,
  actor_user_id uuid,
  activity_type text not null check (activity_type in ('uploaded', 'edited', 'archived')),
  note text not null check (char_length(note) between 1 and 1000),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id) on delete cascade,
  foreign key (actor_user_id, organization_id)
    references public.users(id, organization_id) on delete set null (actor_user_id)
);

create index documents_organization_active_created_idx
  on public.documents (organization_id, created_at desc)
  where archived_at is null;

create index document_activities_document_occurred_idx
  on public.document_activities (organization_id, document_id, occurred_at desc);

alter table public.document_activities enable row level security;
revoke all on table public.document_activities from anon, authenticated;
grant all on table public.document_activities to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-documents',
  'source-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
