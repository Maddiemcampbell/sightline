-- V3.1 collaborative teams and role-based membership management.

alter table public.organization_memberships
  drop constraint if exists organization_memberships_role_check;
alter table public.organization_memberships
  add constraint organization_memberships_role_check
  check (role in ('owner', 'administrator', 'manager', 'contributor'));

alter table public.organization_memberships
  add column last_active_at timestamptz,
  add column avatar_url text;

alter table public.invitations
  add column role text not null default 'contributor'
    check (role in ('administrator', 'manager', 'contributor')),
  add column last_sent_at timestamptz not null default now(),
  add column send_count integer not null default 1 check (send_count > 0);

create table public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  organization_membership_id uuid not null,
  created_at timestamptz not null default now(),
  created_by_membership_id uuid,
  unique (project_id, organization_membership_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (organization_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade,
  foreign key (created_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete set null
);

create table public.team_activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_membership_id uuid,
  target_membership_id uuid,
  event_type text not null check (event_type in (
    'member_invited', 'invitation_revoked', 'invitation_resent',
    'member_removed', 'member_role_changed', 'ownership_transferred',
    'project_members_changed'
  )),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (actor_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete set null,
  foreign key (target_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete set null
);

create table public.notification_placeholders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_membership_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  foreign key (recipient_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade
);

create index project_memberships_organization_member_idx
  on public.project_memberships (organization_id, organization_membership_id);
create index team_activity_events_organization_created_idx
  on public.team_activity_events (organization_id, created_at desc);
create index notification_placeholders_recipient_idx
  on public.notification_placeholders (organization_id, recipient_membership_id, created_at desc);
create index organization_memberships_last_active_idx
  on public.organization_memberships (organization_id, last_active_at desc nulls last);

alter table public.project_memberships enable row level security;
alter table public.team_activity_events enable row level security;
alter table public.notification_placeholders enable row level security;

create policy project_memberships_member_select
  on public.project_memberships for select to authenticated
  using ((select public.is_organization_member(organization_id)));
create policy team_activity_events_member_select
  on public.team_activity_events for select to authenticated
  using ((select public.is_organization_member(organization_id)));
create policy notification_placeholders_recipient_select
  on public.notification_placeholders for select to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships membership
      where membership.id = recipient_membership_id
        and membership.organization_id = organization_id
        and membership.auth_user_id = (select auth.uid())
    )
  );

grant select on public.project_memberships, public.team_activity_events,
  public.notification_placeholders to authenticated;
grant all on public.project_memberships, public.team_activity_events,
  public.notification_placeholders to service_role;

create or replace function public.enforce_organization_owner_invariants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_owners integer;
begin
  if old.role <> 'owner' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;

  perform 1 from public.organizations
  where id = old.organization_id
  for update;

  select count(*) into remaining_owners
  from public.organization_memberships
  where organization_id = old.organization_id
    and role = 'owner'
    and id <> old.id;

  if remaining_owners = 0 then
    raise exception 'The last owner cannot be removed or downgraded';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger organization_memberships_owner_guard
  before update of role or delete on public.organization_memberships
  for each row execute function public.enforce_organization_owner_invariants();

create or replace function public.sync_membership_application_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set role = case new.role
    when 'owner' then 'admin'::public.user_role
    when 'administrator' then 'admin'::public.user_role
    when 'manager' then 'project_manager'::public.user_role
    else 'operations'::public.user_role
  end
  where id = new.application_user_id
    and organization_id = new.organization_id;
  return new;
end;
$$;

create trigger organization_memberships_sync_application_role
  after insert or update of role on public.organization_memberships
  for each row execute function public.sync_membership_application_role();

create or replace function public.transfer_organization_ownership(
  target_organization_id uuid,
  actor_membership_id uuid,
  target_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.organization_memberships;
  target public.organization_memberships;
begin
  if actor_membership_id = target_membership_id then
    raise exception 'Ownership cannot be transferred to the current owner';
  end if;
  perform 1 from public.organizations
  where id = target_organization_id
  for update;
  select * into actor from public.organization_memberships
  where id = actor_membership_id and organization_id = target_organization_id;
  select * into target from public.organization_memberships
  where id = target_membership_id and organization_id = target_organization_id;
  if actor.id is null or actor.role <> 'owner' or target.id is null
    or target.role = 'owner'
  then raise exception 'Invalid ownership transfer';
  end if;
  update public.organization_memberships
  set role = 'owner'
  where id = target.id and organization_id = target_organization_id;
  update public.organization_memberships
  set role = 'administrator'
  where id = actor.id and organization_id = target_organization_id;
end;
$$;

revoke all on function public.transfer_organization_ownership(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.transfer_organization_ownership(uuid, uuid, uuid)
  to service_role;

-- Existing organizations start with every project assigned to every current
-- member so the role rollout does not unexpectedly hide production work.
insert into public.project_memberships (
  organization_id, project_id, organization_membership_id
)
select project.organization_id, project.id, membership.id
from public.projects project
join public.organization_memberships membership
  on membership.organization_id = project.organization_id
on conflict do nothing;

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
  select * into selected_invitation
  from public.invitations invitation
  where invitation.token_hash = invitation_token_hash
  for update;

  if selected_invitation.id is null
    or selected_invitation.accepted_at is not null
    or selected_invitation.revoked_at is not null
    or selected_invitation.expires_at <= now()
    or selected_invitation.email <> lower(principal_email)
  then raise exception 'Invitation is invalid or expired';
  end if;

  if exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = selected_invitation.organization_id
      and membership.auth_user_id = principal_auth_user_id
  ) then raise exception 'User is already a member';
  end if;

  insert into public.users (
    organization_id, auth_user_id, email, full_name, role
  ) values (
    selected_invitation.organization_id, principal_auth_user_id,
    lower(principal_email), principal_full_name,
    case selected_invitation.role
      when 'administrator' then 'admin'
      when 'manager' then 'project_manager'
      else 'operations'
    end
  ) returning id into new_application_user_id;

  insert into public.organization_memberships (
    organization_id, auth_user_id, application_user_id, role, last_active_at
  ) values (
    selected_invitation.organization_id, principal_auth_user_id,
    new_application_user_id, selected_invitation.role, now()
  ) returning id into new_membership_id;

  update public.invitations
  set accepted_at = now(), accepted_by_auth_user_id = principal_auth_user_id
  where id = selected_invitation.id;

  return new_membership_id;
end;
$$;

create or replace function public.current_organization_role(
  target_organization_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select membership.role
  from public.organization_memberships membership
  where membership.organization_id = target_organization_id
    and membership.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_project(
  target_organization_id uuid,
  target_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.current_organization_role(target_organization_id)
      in ('owner', 'administrator') then true
    else exists (
      select 1
      from public.project_memberships assignment
      join public.organization_memberships membership
        on membership.id = assignment.organization_membership_id
       and membership.organization_id = assignment.organization_id
      where assignment.organization_id = target_organization_id
        and assignment.project_id = target_project_id
        and membership.auth_user_id = auth.uid()
    )
  end;
$$;

revoke all on function public.current_organization_role(uuid),
  public.can_access_project(uuid, uuid) from public;
grant execute on function public.current_organization_role(uuid),
  public.can_access_project(uuid, uuid) to authenticated, service_role;

drop policy if exists projects_member_select on public.projects;
drop policy if exists projects_member_insert on public.projects;
drop policy if exists projects_member_update on public.projects;
drop policy if exists projects_member_delete on public.projects;
create policy projects_role_select on public.projects for select to authenticated
  using ((select public.can_access_project(organization_id, id)));
create policy projects_admin_insert on public.projects for insert to authenticated
  with check ((select public.current_organization_role(organization_id))
    in ('owner', 'administrator'));
create policy projects_admin_update on public.projects for update to authenticated
  using ((select public.current_organization_role(organization_id))
    in ('owner', 'administrator'))
  with check ((select public.current_organization_role(organization_id))
    in ('owner', 'administrator'));
create policy projects_admin_delete on public.projects for delete to authenticated
  using ((select public.current_organization_role(organization_id))
    in ('owner', 'administrator'));

drop policy if exists risks_member_select on public.risks;
drop policy if exists risks_member_insert on public.risks;
drop policy if exists risks_member_update on public.risks;
drop policy if exists risks_member_delete on public.risks;
create policy risks_role_select on public.risks for select to authenticated
  using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (
      project_id is not null
      and (select public.can_access_project(organization_id, project_id))
    )
  );
create policy risks_manager_insert on public.risks for insert to authenticated
  with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager')
    and project_id is not null
    and (select public.can_access_project(organization_id, project_id))
  );
create policy risks_manager_update on public.risks for update to authenticated
  using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager')
    and project_id is not null
    and (select public.can_access_project(organization_id, project_id))
  )
  with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager')
    and project_id is not null
    and (select public.can_access_project(organization_id, project_id))
  );
create policy risks_manager_delete on public.risks for delete to authenticated
  using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager')
    and project_id is not null
    and (select public.can_access_project(organization_id, project_id))
  );

drop policy if exists recommended_actions_member_select on public.recommended_actions;
drop policy if exists recommended_actions_member_insert on public.recommended_actions;
drop policy if exists recommended_actions_member_update on public.recommended_actions;
drop policy if exists recommended_actions_member_delete on public.recommended_actions;
create policy recommended_actions_role_select
  on public.recommended_actions for select to authenticated using (
    exists (
      select 1 from public.risks risk
      where risk.id = risk_id and risk.organization_id = organization_id
        and risk.project_id is not null
        and (select public.can_access_project(organization_id, risk.project_id))
    )
  );
create policy recommended_actions_role_update
  on public.recommended_actions for update to authenticated using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager', 'contributor')
    and exists (
      select 1 from public.risks risk
      where risk.id = risk_id and risk.organization_id = organization_id
        and risk.project_id is not null
        and (select public.can_access_project(organization_id, risk.project_id))
    )
  ) with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager', 'contributor')
  );
create policy recommended_actions_manager_insert
  on public.recommended_actions for insert to authenticated with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager')
  );
create policy recommended_actions_manager_delete
  on public.recommended_actions for delete to authenticated using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager')
  );

drop policy if exists documents_member_select on public.documents;
drop policy if exists documents_member_insert on public.documents;
drop policy if exists documents_member_update on public.documents;
drop policy if exists documents_member_delete on public.documents;
create policy documents_role_select on public.documents for select to authenticated
  using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (
      project_id is not null
      and (select public.can_access_project(organization_id, project_id))
    )
  );
create policy documents_role_insert on public.documents for insert to authenticated
  with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager', 'contributor')
    and (
      (select public.current_organization_role(organization_id))
        in ('owner', 'administrator')
      or (
        project_id is not null
        and (select public.can_access_project(organization_id, project_id))
      )
    )
  );
create policy documents_manager_update on public.documents for update to authenticated
  using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager')
  ) with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator', 'manager')
  );
create policy documents_manager_delete on public.documents for delete to authenticated
  using ((select public.current_organization_role(organization_id))
    in ('owner', 'administrator', 'manager'));

create or replace function public.restrict_contributor_action_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_user_id uuid;
begin
  if public.current_organization_role(old.organization_id)
    is distinct from 'contributor'
  then return new;
  end if;
  select membership.application_user_id into application_user_id
  from public.organization_memberships membership
  where membership.organization_id = old.organization_id
    and membership.auth_user_id = auth.uid();
  if old.owner_user_id is distinct from application_user_id
    or new.owner_user_id is distinct from old.owner_user_id
    or new.status <> 'completed'
    or (to_jsonb(new) - array['status', 'completed_at', 'updated_at'])
       is distinct from
       (to_jsonb(old) - array['status', 'completed_at', 'updated_at'])
  then raise exception 'Contributors may only complete their assigned actions';
  end if;
  return new;
end;
$$;

create trigger recommended_actions_contributor_update_guard
  before update on public.recommended_actions
  for each row execute function public.restrict_contributor_action_updates();
