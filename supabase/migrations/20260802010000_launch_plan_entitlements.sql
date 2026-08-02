-- Launch entitlements: Essential (5 active projects) and Professional (10).
-- Both plans intentionally permit one organization membership per Auth user.

alter table public.organizations
  add column plan_key text not null default 'essential'
    check (plan_key in ('essential', 'professional'));

alter table public.organization_billing_accounts
  alter column plan_key set default 'essential';
update public.organization_billing_accounts
set plan_key = 'essential'
where plan_key = 'design_partner';
alter table public.organization_billing_accounts
  add constraint organization_billing_accounts_plan_key_check
  check (plan_key in ('essential', 'professional'));

alter table public.projects
  add column archived_at timestamptz,
  add column archived_by_user_id uuid references public.users(id) on delete set null;
create index projects_organization_active_idx
  on public.projects (organization_id, created_at desc)
  where archived_at is null;

drop policy if exists projects_role_select on public.projects;
create policy projects_role_select on public.projects for select to authenticated
  using (
    archived_at is null
    and (select public.can_access_project(organization_id, id))
  );

create or replace function public.organization_project_limit(target_plan_key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case target_plan_key
    when 'professional' then 10
    else 5
  end;
$$;

create or replace function public.enforce_project_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_plan_key text;
  active_project_count integer;
begin
  if (tg_op = 'UPDATE' and not (
    old.archived_at is not null and new.archived_at is null
  )) or (tg_op = 'INSERT' and new.archived_at is not null) then
    return new;
  end if;
  select organization.plan_key into selected_plan_key
  from public.organizations organization
  where organization.id = new.organization_id
  for update;
  select count(*) into active_project_count
  from public.projects project
  where project.organization_id = new.organization_id
    and project.archived_at is null
    and (tg_op <> 'UPDATE' or project.id <> new.id);
  if active_project_count >= public.organization_project_limit(selected_plan_key)
  then raise exception 'PLAN_PROJECT_LIMIT_REACHED';
  end if;
  return new;
end;
$$;
create trigger projects_capacity_guard
  before insert or update of archived_at on public.projects
  for each row execute function public.enforce_project_capacity();

create or replace function public.protect_organization_plan_key()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.plan_key <> old.plan_key
    and coalesce(auth.role(), '') <> 'service_role'
  then raise exception 'Organization plan changes require the billing service';
  end if;
  return new;
end;
$$;
create trigger organizations_plan_key_guard
  before update of plan_key on public.organizations
  for each row execute function public.protect_organization_plan_key();

create or replace function public.create_entitled_project(
  target_organization_id uuid,
  principal_application_user_id uuid,
  project_name text,
  project_number_value text,
  project_address_line_1 text,
  project_city text,
  project_state_code text,
  project_postal_code text,
  project_start_date date,
  project_target_completion_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_plan_key text;
  active_project_count integer;
  new_project_id uuid;
begin
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.auth_user_id = auth.uid()
      and membership.application_user_id = principal_application_user_id
      and membership.role in ('owner', 'administrator')
  ) then raise exception 'Project creation is not authorized';
  end if;

  select organization.plan_key into selected_plan_key
  from public.organizations organization
  where organization.id = target_organization_id
  for update;
  if selected_plan_key is null then raise exception 'Organization not found'; end if;

  select count(*) into active_project_count
  from public.projects project
  where project.organization_id = target_organization_id
    and project.archived_at is null;
  if active_project_count >= public.organization_project_limit(selected_plan_key)
  then raise exception 'PLAN_PROJECT_LIMIT_REACHED';
  end if;

  insert into public.projects (
    organization_id, name, project_number, status, address_line_1, city,
    state_code, postal_code, start_date, target_completion_date,
    projected_margin_cents, updated_by_user_id
  ) values (
    target_organization_id, project_name, project_number_value, 'active',
    project_address_line_1, project_city, project_state_code,
    project_postal_code, project_start_date, project_target_completion_date,
    0, principal_application_user_id
  ) returning id into new_project_id;
  return new_project_id;
end;
$$;

create or replace function public.set_project_archived(
  target_organization_id uuid,
  target_project_id uuid,
  principal_application_user_id uuid,
  should_archive boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_plan_key text;
  active_project_count integer;
begin
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.auth_user_id = auth.uid()
      and membership.application_user_id = principal_application_user_id
      and membership.role in ('owner', 'administrator')
  ) then raise exception 'Project archival is not authorized';
  end if;

  select organization.plan_key into selected_plan_key
  from public.organizations organization
  where organization.id = target_organization_id
  for update;
  if selected_plan_key is null then raise exception 'Organization not found'; end if;

  if not should_archive then
    select count(*) into active_project_count
    from public.projects project
    where project.organization_id = target_organization_id
      and project.archived_at is null;
    if active_project_count >= public.organization_project_limit(selected_plan_key)
    then raise exception 'PLAN_PROJECT_LIMIT_REACHED';
    end if;
  end if;

  update public.projects
  set archived_at = case when should_archive then now() else null end,
      archived_by_user_id = case
        when should_archive then principal_application_user_id else null
      end
  where id = target_project_id
    and organization_id = target_organization_id
    and (
      (should_archive and archived_at is null)
      or (not should_archive and archived_at is not null)
    );
  if not found then raise exception 'Project archival state is unchanged'; end if;
end;
$$;

revoke all on function public.organization_project_limit(text),
  public.create_entitled_project(uuid, uuid, text, text, text, text, text, text, date, date),
  public.set_project_archived(uuid, uuid, uuid, boolean) from public;
grant execute on function public.organization_project_limit(text),
  public.create_entitled_project(uuid, uuid, text, text, text, text, text, text, date, date),
  public.set_project_archived(uuid, uuid, uuid, boolean) to authenticated, service_role;

create or replace function public.enforce_single_organization_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.organization_memberships membership
    where membership.auth_user_id = new.auth_user_id
      and membership.organization_id <> new.organization_id
  ) then raise exception 'PLAN_SINGLE_ORGANIZATION_ONLY';
  end if;
  return new;
end;
$$;
create trigger organization_memberships_single_organization_guard
  before insert or update of auth_user_id, organization_id
  on public.organization_memberships
  for each row execute function public.enforce_single_organization_membership();

create or replace function public.sync_organization_billing_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is not null then
    update public.organizations
    set plan_key = new.plan_key
    where id = new.organization_id;
  end if;
  return new;
end;
$$;
create trigger organization_billing_accounts_sync_plan
  after insert or update of organization_id, plan_key
  on public.organization_billing_accounts
  for each row execute function public.sync_organization_billing_plan();
