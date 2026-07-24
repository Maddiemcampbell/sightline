-- Organization administration preferences.

alter table public.organizations
  add column logo_url text,
  add column brand_color text not null default '#164E3B'
    check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column default_currency text not null default 'USD'
    check (default_currency ~ '^[A-Z]{3}$'),
  add column industry text,
  add column company_size text
    check (company_size is null or company_size in ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001+')),
  add column notification_defaults jsonb not null default
    '{"assignment":true,"mention":true,"digest":"daily","weeklySummary":true}'::jsonb,
  add column default_project_visibility text not null default 'private'
    check (default_project_visibility in ('private', 'organization')),
  add column default_project_role text not null default 'contributor'
    check (default_project_role in ('manager', 'contributor', 'viewer')),
  add column default_document_permissions text not null default 'project_members'
    check (default_document_permissions in ('project_members', 'managers', 'organization'));

alter table public.users
  add column assignment_notifications_enabled boolean not null default true,
  add column mention_notifications_enabled boolean not null default true,
  add column weekly_summary_enabled boolean not null default true,
  add column digest_frequency text not null default 'daily'
    check (digest_frequency in ('off', 'daily', 'weekly'));

grant update (
  name, logo_url, brand_color, timezone, default_currency, industry,
  company_size, notification_defaults, default_project_visibility,
  default_project_role, default_document_permissions
) on public.organizations to authenticated;

grant update (
  full_name, title, delivery_timezone, preferred_delivery_time,
  email_delivery_enabled, assignment_notifications_enabled,
  mention_notifications_enabled, weekly_summary_enabled, digest_frequency
) on public.users to authenticated;
