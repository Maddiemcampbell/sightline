-- Purpose-built, minimized read models for the staff customer directory.
-- These views are service-role-only and are never available to customer roles.

create extension if not exists pg_trgm with schema extensions;

create index organizations_name_trgm_idx
  on public.organizations using gin (name extensions.gin_trgm_ops);
create index users_full_name_trgm_idx
  on public.users using gin (full_name extensions.gin_trgm_ops);
create index users_email_trgm_idx
  on public.users using gin (email extensions.gin_trgm_ops);

create view public.platform_organization_directory
with (security_invoker = true)
as
select
  organization.id,
  organization.name,
  organization.slug,
  organization.privacy_status as account_status,
  organization.created_at,
  organization.timezone,
  coalesce(membership.member_count, 0)::integer as member_count,
  coalesce(project.active_project_count, 0)::integer as active_project_count,
  membership.last_activity_at,
  coalesce(document.storage_bytes, 0)::bigint as storage_bytes,
  coalesce(job.failed_job_count, 0)::integer as failed_job_count,
  coalesce(delivery.failed_delivery_count, 0)::integer as failed_delivery_count,
  coalesce(export.failed_export_count, 0)::integer as failed_export_count,
  coalesce(ai.failed_ai_count, 0)::integer as failed_ai_count
from public.organizations organization
left join lateral (
  select
    count(*) as member_count,
    max(item.last_active_at) as last_activity_at
  from public.organization_memberships item
  where item.organization_id = organization.id
) membership on true
left join lateral (
  select count(*) filter (where item.status = 'active') as active_project_count
  from public.projects item
  where item.organization_id = organization.id
) project on true
left join lateral (
  select sum(coalesce(item.size_bytes, 0)) as storage_bytes
  from public.documents item
  where item.organization_id = organization.id
    and item.archived_at is null
) document on true
left join lateral (
  select count(*) filter (where item.status = 'failed') as failed_job_count
  from public.organization_job_runs item
  where item.organization_id = organization.id
) job on true
left join lateral (
  select count(*) filter (where item.status = 'failed') as failed_delivery_count
  from public.daily_brief_deliveries item
  where item.organization_id = organization.id
) delivery on true
left join lateral (
  select count(*) filter (where item.status = 'failed') as failed_export_count
  from public.organization_data_exports item
  where item.organization_id = organization.id
) export on true
left join lateral (
  select count(*) filter (where item.status = 'failed') as failed_ai_count
  from public.ai_analysis_runs item
  where item.organization_id = organization.id
) ai on true;

create view public.platform_user_directory
with (security_invoker = false)
as
select
  auth_user.id,
  auth_user.email,
  coalesce(profile.full_name, split_part(coalesce(auth_user.email, ''), '@', 1))
    as full_name,
  case
    when auth_user.deleted_at is not null then 'deleted'
    when auth_user.banned_until is not null and auth_user.banned_until > now()
      then 'suspended'
    when auth_user.email_confirmed_at is null then 'unverified'
    else 'active'
  end as account_status,
  auth_user.created_at,
  auth_user.last_sign_in_at,
  auth_user.email_confirmed_at,
  coalesce(auth_user.raw_app_meta_data ->> 'provider', 'email') as auth_provider,
  exists (
    select 1 from auth.mfa_factors factor
    where factor.user_id = auth_user.id and factor.status = 'verified'
  ) as mfa_enabled,
  coalesce(membership.membership_count, 0)::integer as membership_count,
  membership.last_activity_at,
  coalesce(membership.organization_names, array[]::text[]) as organization_names
from auth.users auth_user
left join lateral (
  select max(item.full_name) as full_name
  from public.users item
  where item.auth_user_id = auth_user.id
) profile on true
left join lateral (
  select
    count(*) as membership_count,
    max(item.last_active_at) as last_activity_at,
    array_agg(organization.name order by organization.name) as organization_names
  from public.organization_memberships item
  join public.organizations organization on organization.id = item.organization_id
  where item.auth_user_id = auth_user.id
) membership on true
where not exists (
  select 1 from public.platform_operators operator
  where operator.auth_user_id = auth_user.id
);

revoke all on table public.platform_organization_directory,
  public.platform_user_directory
from public, anon, authenticated;
grant select on table public.platform_organization_directory,
  public.platform_user_directory
to service_role;

comment on view public.platform_organization_directory is
  'Minimized operational organization aggregate for authorized staff services.';
comment on view public.platform_user_directory is
  'Minimized Auth-account aggregate for authorized staff services; excludes platform operators.';
