-- V3.1 organization membership foundation.
-- All initial memberships are owners; finer-grained roles are intentionally deferred.

alter table public.organizations
  add column created_by_auth_user_id uuid references auth.users(id) on delete set null;

alter table public.users drop constraint if exists users_auth_user_id_key;
create unique index users_organization_auth_user_idx
  on public.users (organization_id, auth_user_id)
  where auth_user_id is not null;

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  application_user_id uuid not null,
  role text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, auth_user_id),
  unique (organization_id, application_user_id),
  foreign key (application_user_id, organization_id)
    references public.users(id, organization_id) on delete cascade
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  token_hash text not null unique check (char_length(token_hash) = 64),
  invited_by_membership_id uuid not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_auth_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (invited_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade,
  check (expires_at > created_at),
  check (
    (accepted_at is null and accepted_by_auth_user_id is null)
    or (accepted_at is not null and accepted_by_auth_user_id is not null)
  ),
  check (accepted_at is null or revoked_at is null)
);

create unique index invitations_pending_organization_email_idx
  on public.invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;
create index invitations_token_hash_idx on public.invitations (token_hash);
create index invitations_organization_created_idx
  on public.invitations (organization_id, created_at desc);
create index organization_memberships_auth_user_idx
  on public.organization_memberships (auth_user_id, created_at);
create index organization_memberships_organization_idx
  on public.organization_memberships (organization_id, created_at);

create trigger organization_memberships_set_updated_at
  before update on public.organization_memberships
  for each row execute function public.set_updated_at();

insert into public.organization_memberships (
  organization_id,
  auth_user_id,
  application_user_id
)
select organization_id, auth_user_id, id
from public.users
where auth_user_id is not null
on conflict (organization_id, auth_user_id) do nothing;

update public.organizations organization
set created_by_auth_user_id = membership.auth_user_id
from public.organization_memberships membership
where membership.organization_id = organization.id
  and organization.created_by_auth_user_id is null;

create or replace function public.is_organization_member(
  target_organization_id uuid,
  target_auth_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.auth_user_id = target_auth_user_id
  );
$$;

revoke all on function public.is_organization_member(uuid, uuid) from public;
grant execute on function public.is_organization_member(uuid, uuid) to authenticated, service_role;

alter table public.organization_memberships enable row level security;
alter table public.invitations enable row level security;

create policy organizations_member_select
  on public.organizations for select to authenticated
  using ((select public.is_organization_member(id)));
create policy organizations_member_update
  on public.organizations for update to authenticated
  using ((select public.is_organization_member(id)))
  with check ((select public.is_organization_member(id)));

create policy organization_memberships_member_select
  on public.organization_memberships for select to authenticated
  using ((select public.is_organization_member(organization_id)));

create policy invitations_member_select
  on public.invitations for select to authenticated
  using (
    (select public.is_organization_member(organization_id))
    or email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

grant select on public.organizations to authenticated;
grant update (name, slug, timezone) on public.organizations to authenticated;
grant select on public.organization_memberships, public.invitations to authenticated;
grant all on public.organization_memberships, public.invitations to service_role;

do $$
declare
  tenant_table text;
begin
  foreach tenant_table in array array[
    'users',
    'projects',
    'vendors',
    'project_vendors',
    'integration_sources',
    'documents',
    'document_extracted_fields',
    'project_detection_settings',
    'detection_runs',
    'ai_analysis_runs',
    'ai_risk_suggestions',
    'daily_brief_deliveries',
    'document_activities',
    'risks',
    'risk_evidence',
    'risk_email_drafts',
    'risk_conversations',
    'risk_conversation_messages',
    'risk_answer_feedback',
    'recommended_actions',
    'risk_resolutions',
    'daily_briefs',
    'brief_items',
    'risk_activities'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_organization_member(organization_id)))',
      tenant_table || '_member_select',
      tenant_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_organization_member(organization_id)))',
      tenant_table || '_member_insert',
      tenant_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)))',
      tenant_table || '_member_update',
      tenant_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_organization_member(organization_id)))',
      tenant_table || '_member_delete',
      tenant_table
    );
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      tenant_table
    );
  end loop;
end;
$$;

create or replace function public.create_organization_for_user(
  organization_name text,
  organization_slug text,
  principal_auth_user_id uuid,
  principal_email text,
  principal_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
  new_application_user_id uuid;
  new_membership_id uuid;
begin
  insert into public.organizations (name, slug, created_by_auth_user_id)
  values (organization_name, organization_slug, principal_auth_user_id)
  returning id into new_organization_id;

  insert into public.users (
    organization_id,
    auth_user_id,
    email,
    full_name,
    role
  )
  values (
    new_organization_id,
    principal_auth_user_id,
    lower(principal_email),
    principal_full_name,
    'admin'
  )
  returning id into new_application_user_id;

  insert into public.organization_memberships (
    organization_id,
    auth_user_id,
    application_user_id
  )
  values (
    new_organization_id,
    principal_auth_user_id,
    new_application_user_id
  )
  returning id into new_membership_id;

  return new_membership_id;
end;
$$;

create or replace function public.accept_organization_invitation(
  invitation_token_hash text,
  principal_auth_user_id uuid,
  principal_email text,
  principal_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_invitation public.invitations;
  new_application_user_id uuid;
  new_membership_id uuid;
begin
  select *
  into selected_invitation
  from public.invitations invitation
  where invitation.token_hash = invitation_token_hash
  for update;

  if selected_invitation.id is null
    or selected_invitation.accepted_at is not null
    or selected_invitation.revoked_at is not null
    or selected_invitation.expires_at <= now()
    or selected_invitation.email <> lower(principal_email)
  then
    raise exception 'Invitation is invalid or expired';
  end if;

  if exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = selected_invitation.organization_id
      and membership.auth_user_id = principal_auth_user_id
  ) then
    raise exception 'User is already a member';
  end if;

  insert into public.users (
    organization_id,
    auth_user_id,
    email,
    full_name,
    role
  )
  values (
    selected_invitation.organization_id,
    principal_auth_user_id,
    lower(principal_email),
    principal_full_name,
    'operations'
  )
  returning id into new_application_user_id;

  insert into public.organization_memberships (
    organization_id,
    auth_user_id,
    application_user_id
  )
  values (
    selected_invitation.organization_id,
    principal_auth_user_id,
    new_application_user_id
  )
  returning id into new_membership_id;

  update public.invitations
  set accepted_at = now(),
      accepted_by_auth_user_id = principal_auth_user_id
  where id = selected_invitation.id;

  return new_membership_id;
end;
$$;

create or replace function public.leave_organization(
  target_membership_id uuid,
  principal_auth_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_membership public.organization_memberships;
  member_count integer;
begin
  select *
  into selected_membership
  from public.organization_memberships membership
  where membership.id = target_membership_id
    and membership.auth_user_id = principal_auth_user_id
  for update;

  if selected_membership.id is null then
    raise exception 'Membership not found';
  end if;

  select count(*)
  into member_count
  from public.organization_memberships membership
  where membership.organization_id = selected_membership.organization_id;

  if member_count <= 1 then
    raise exception 'The final owner cannot leave the organization';
  end if;

  update public.users
  set auth_user_id = null
  where id = selected_membership.application_user_id
    and organization_id = selected_membership.organization_id;

  delete from public.organization_memberships
  where id = selected_membership.id;
end;
$$;

revoke all on function public.create_organization_for_user(text, text, uuid, text, text) from public;
revoke all on function public.accept_organization_invitation(text, uuid, text, text) from public;
revoke all on function public.leave_organization(uuid, uuid) from public;
grant execute on function public.create_organization_for_user(text, text, uuid, text, text) to service_role;
grant execute on function public.accept_organization_invitation(text, uuid, text, text) to service_role;
grant execute on function public.leave_organization(uuid, uuid) to service_role;
