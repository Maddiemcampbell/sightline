-- Asynchronous, organization-scoped customer data exports.

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'organization-exports',
  'organization-exports',
  false,
  52428800,
  array['application/json', 'application/zip']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.organization_data_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_membership_id uuid,
  requested_by_auth_user_id uuid references auth.users(id) on delete set null,
  requested_by_name text not null check (char_length(requested_by_name) between 1 and 160),
  requested_by_email text not null,
  export_format text not null check (export_format in ('csv', 'json', 'zip')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'ready', 'failed', 'expired')),
  storage_path text,
  artifact_name text,
  artifact_mime_type text,
  artifact_size_bytes bigint check (artifact_size_bytes is null or artifact_size_bytes >= 0),
  checksum_sha256 text check (checksum_sha256 is null or char_length(checksum_sha256) = 64),
  manifest jsonb not null default '{}'::jsonb,
  failure_code text,
  requested_at timestamptz not null default now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  expired_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (requested_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete set null,
  check (
    storage_path is null
    or storage_path like organization_id::text || '/' || id::text || '/%'
  ),
  check (
    status <> 'ready'
    or (
      storage_path is not null
      and artifact_name is not null
      and artifact_mime_type is not null
      and checksum_sha256 is not null
      and completed_at is not null
      and expires_at is not null
    )
  )
);

create index organization_data_exports_history_idx
  on public.organization_data_exports (organization_id, requested_at desc);
create index organization_data_exports_queue_idx
  on public.organization_data_exports (status, requested_at)
  where status in ('queued', 'processing');
create index organization_data_exports_expiry_idx
  on public.organization_data_exports (expires_at)
  where status = 'ready';

create trigger organization_data_exports_set_updated_at
  before update on public.organization_data_exports
  for each row execute function public.set_updated_at();

alter table public.organization_data_exports enable row level security;
revoke all on table public.organization_data_exports from anon, authenticated;
grant select on table public.organization_data_exports to authenticated;
grant all on table public.organization_data_exports to service_role;

create policy organization_data_exports_admin_select
  on public.organization_data_exports for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = organization_data_exports.organization_id
        and membership.auth_user_id = (select auth.uid())
        and membership.role in ('owner', 'administrator')
    )
  );

-- There are deliberately no storage.objects policies for this bucket.
-- All artifact access is mediated by authorized server endpoints.

create or replace function public.claim_organization_data_exports(batch_size integer default 5)
returns setof public.organization_data_exports
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;
  return query
  with candidates as (
    select export.id
    from public.organization_data_exports export
    where (
      export.status = 'queued'
      or (
        export.status = 'processing'
        and export.processing_started_at < now() - interval '1 hour'
      )
    )
      and export.attempt_count < 5
    order by export.requested_at
    for update skip locked
    limit greatest(1, least(batch_size, 20))
  )
  update public.organization_data_exports export
  set
    status = 'processing',
    processing_started_at = now(),
    attempt_count = export.attempt_count + 1,
    failure_code = null
  from candidates
  where export.id = candidates.id
  returning export.*;
end;
$$;

revoke all on function public.claim_organization_data_exports(integer) from public;
grant execute on function public.claim_organization_data_exports(integer) to service_role;

alter table public.notifications
  drop constraint notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (notification_type in (
    'mention', 'assignment', 'role_change', 'invitation', 'project_added',
    'risk_assigned', 'action_completed', 'data_export_ready'
  ));
