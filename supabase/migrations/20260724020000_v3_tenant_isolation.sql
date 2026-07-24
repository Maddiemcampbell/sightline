-- V3.1 tenant-isolation hardening.
-- The membership migration establishes CRUD policies for every existing
-- organization-owned business table. This migration adds immutable audit logs,
-- storage-object isolation, and a database constraint for document paths.

-- Lifecycle writes are performed only through verified, service-role-backed
-- atomic functions. False policies make the direct authenticated behavior
-- explicit for all four CRUD operations.
create policy organizations_no_direct_insert
  on public.organizations for insert to authenticated
  with check (false);
create policy organizations_no_direct_delete
  on public.organizations for delete to authenticated
  using (false);

create policy organization_memberships_no_direct_insert
  on public.organization_memberships for insert to authenticated
  with check (false);
create policy organization_memberships_no_direct_update
  on public.organization_memberships for update to authenticated
  using (false) with check (false);
create policy organization_memberships_no_direct_delete
  on public.organization_memberships for delete to authenticated
  using (false);

create policy invitations_no_direct_insert
  on public.invitations for insert to authenticated
  with check (false);
create policy invitations_no_direct_update
  on public.invitations for update to authenticated
  using (false) with check (false);
create policy invitations_no_direct_delete
  on public.invitations for delete to authenticated
  using (false);

alter table public.documents
  add constraint documents_storage_path_organization_check
  check (
    storage_path is null
    or storage_path like organization_id::text || '/%'
  ) not valid;

alter table public.documents
  validate constraint documents_storage_path_organization_check;

create unique index documents_storage_path_unique_idx
  on public.documents (storage_path)
  where storage_path is not null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid,
  event_type text not null check (char_length(event_type) between 3 and 120),
  resource_type text not null check (char_length(resource_type) between 2 and 120),
  resource_id uuid,
  outcome text not null default 'success'
    check (outcome in ('success', 'denied', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (actor_user_id, organization_id)
    references public.users(id, organization_id) on delete set null (actor_user_id)
);

create index audit_logs_organization_occurred_idx
  on public.audit_logs (organization_id, occurred_at desc, id desc);
create index audit_logs_organization_resource_idx
  on public.audit_logs (organization_id, resource_type, resource_id)
  where resource_id is not null;

alter table public.audit_logs enable row level security;

create policy audit_logs_member_select
  on public.audit_logs for select to authenticated
  using ((select public.is_organization_member(organization_id)));

create policy audit_logs_member_insert
  on public.audit_logs for insert to authenticated
  with check (
    (select public.is_organization_member(organization_id))
    and (
      actor_auth_user_id is null
      or actor_auth_user_id = (select auth.uid())
    )
  );

-- Audit history is append-only. Explicit false policies document and enforce
-- the UPDATE and DELETE behavior even if table grants change later.
create policy audit_logs_no_update
  on public.audit_logs for update to authenticated
  using (false)
  with check (false);

create policy audit_logs_no_delete
  on public.audit_logs for delete to authenticated
  using (false);

grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

-- Files are stored under <organization UUID>/<document UUID>/<filename>.
-- Authenticated storage API calls may only operate inside a member prefix.
create policy source_documents_member_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'source-documents'
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.auth_user_id = (select auth.uid())
        and membership.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy source_documents_member_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'source-documents'
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.auth_user_id = (select auth.uid())
        and membership.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy source_documents_member_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'source-documents'
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.auth_user_id = (select auth.uid())
        and membership.organization_id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'source-documents'
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.auth_user_id = (select auth.uid())
        and membership.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy source_documents_member_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'source-documents'
    and exists (
      select 1
      from public.organization_memberships membership
      where membership.auth_user_id = (select auth.uid())
        and membership.organization_id::text = (storage.foldername(name))[1]
    )
  );
