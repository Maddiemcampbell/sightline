-- Configurable, deterministic business exceptions with durable lifecycle state.

alter table public.documents
  add column expires_on date;

create table public.exception_alert_rules (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  margin_enabled boolean not null default true,
  margin_floor_percent numeric(6,2) not null default 8 check (margin_floor_percent between -100 and 100),
  budget_enabled boolean not null default true,
  budget_variance_percent numeric(6,2) not null default 5 check (budget_variance_percent between 0 and 100),
  unowned_risk_enabled boolean not null default true,
  action_due_enabled boolean not null default true,
  action_due_days integer not null default 3 check (action_due_days between 0 and 90),
  document_expiry_enabled boolean not null default true,
  document_expiry_days integer not null default 30 check (document_expiry_days between 0 and 365),
  sync_stale_enabled boolean not null default true,
  sync_stale_hours integer not null default 24 check (sync_stale_hours between 1 and 720),
  forecast_stale_enabled boolean not null default true,
  forecast_stale_days integer not null default 14 check (forecast_stale_days between 1 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.exception_alert_rules (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

create table public.exception_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_type text not null check (rule_type in (
    'margin_below_target', 'budget_variance', 'unowned_high_risk',
    'action_due', 'document_expiring', 'sync_stale', 'forecast_inputs_stale'
  )),
  fingerprint text not null,
  subject_type text not null,
  subject_id text not null,
  severity text not null check (severity in ('warning', 'critical')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 1000),
  href text,
  status text not null default 'active' check (status in ('active', 'resolved')),
  payload jsonb not null default '{}'::jsonb,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, fingerprint),
  unique (id, organization_id),
  check ((status = 'resolved' and resolved_at is not null) or (status = 'active' and resolved_at is null))
);

create index exception_alerts_active_idx
  on public.exception_alerts (organization_id, severity, last_detected_at desc)
  where status = 'active';
create index documents_expiry_idx
  on public.documents (organization_id, expires_on)
  where expires_on is not null;

create trigger exception_alert_rules_set_updated_at before update on public.exception_alert_rules
for each row execute function public.set_updated_at();
create trigger exception_alerts_set_updated_at before update on public.exception_alerts
for each row execute function public.set_updated_at();

alter table public.exception_alert_rules enable row level security;
alter table public.exception_alerts enable row level security;

create policy exception_alert_rules_admin_select on public.exception_alert_rules
for select to authenticated using (
  public.current_organization_role(organization_id) in ('owner', 'administrator')
);
create policy exception_alerts_member_select on public.exception_alerts
for select to authenticated using (
  public.current_organization_role(organization_id) is not null
);

revoke all on public.exception_alert_rules, public.exception_alerts from anon;
grant select on public.exception_alert_rules, public.exception_alerts to authenticated;
grant all on public.exception_alert_rules, public.exception_alerts to service_role;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (notification_type in (
    'mention', 'assignment', 'role_change', 'invitation', 'project_added',
    'risk_assigned', 'action_completed', 'data_export_ready',
    'data_export_failed', 'background_job_failed', 'exception_alert'
  ));

comment on table public.exception_alerts is
  'Durable, deduplicated business exceptions that automatically resolve when their deterministic condition clears.';
