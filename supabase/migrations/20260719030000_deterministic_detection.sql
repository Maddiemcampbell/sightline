alter table public.risks add column detection_key text;
alter table public.risks
  add constraint risks_organization_detection_key_unique
  unique (organization_id, detection_key);

alter table public.risk_evidence add column detection_key text;
alter table public.risk_evidence
  add constraint risk_evidence_detection_key_unique
  unique (organization_id, risk_id, detection_key);

alter table public.recommended_actions add column detection_key text;
alter table public.recommended_actions
  add constraint recommended_actions_detection_key_unique
  unique (organization_id, risk_id, detection_key);

create table public.document_extracted_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null,
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]*$'),
  field_value jsonb not null,
  extracted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, document_id, field_key),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id) on delete cascade
);

create table public.project_detection_settings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  concrete_temperature_threshold_f numeric(5, 1) not null default 95,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, project_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade
);

create table public.detection_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trigger_source text not null check (trigger_source in ('manual', 'scheduled')),
  status text not null check (status in ('running', 'complete', 'failed')),
  rule_results jsonb not null default '[]'::jsonb,
  risks_created integer not null default 0 check (risks_created >= 0),
  risks_updated integer not null default 0 check (risks_updated >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index document_extracted_fields_lookup_idx
  on public.document_extracted_fields (organization_id, field_key, extracted_at desc);
create index detection_runs_organization_started_idx
  on public.detection_runs (organization_id, started_at desc);

create trigger document_extracted_fields_set_updated_at
before update on public.document_extracted_fields
for each row execute function public.set_updated_at();

create trigger project_detection_settings_set_updated_at
before update on public.project_detection_settings
for each row execute function public.set_updated_at();

alter table public.document_extracted_fields enable row level security;
alter table public.project_detection_settings enable row level security;
alter table public.detection_runs enable row level security;
revoke all on table public.document_extracted_fields from anon, authenticated;
revoke all on table public.project_detection_settings from anon, authenticated;
revoke all on table public.detection_runs from anon, authenticated;
grant all on table public.document_extracted_fields to service_role;
grant all on table public.project_detection_settings to service_role;
grant all on table public.detection_runs to service_role;

update public.risks set detection_key = 'insurance:apex-electrical-systems:cedar-grove-medical-pavilion'
where id = '60000000-0000-4000-8000-000000000001';
update public.risks set detection_key = 'weather:riverfront-distribution-center:2026-07-20'
where id = '60000000-0000-4000-8000-000000000002';
update public.risks set detection_key = 'repeated-issue:northgate-civic-center:added-backing'
where id = '60000000-0000-4000-8000-000000000003';

update public.risk_evidence
set detection_key = case risk_id
  when '60000000-0000-4000-8000-000000000001' then 'insurance:apex-electrical-systems:cedar-grove-medical-pavilion:50000000-0000-4000-8000-000000000001'
  when '60000000-0000-4000-8000-000000000002' then 'weather:riverfront-distribution-center:2026-07-20:50000000-0000-4000-8000-000000000002'
  when '60000000-0000-4000-8000-000000000003' then 'repeated-issue:northgate-civic-center:added-backing:50000000-0000-4000-8000-000000000003'
end
where risk_id in (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  '60000000-0000-4000-8000-000000000003'
);

update public.recommended_actions
set detection_key = case risk_id
  when '60000000-0000-4000-8000-000000000001' then 'insurance:apex-electrical-systems:cedar-grove-medical-pavilion:action'
  when '60000000-0000-4000-8000-000000000002' then 'weather:riverfront-distribution-center:2026-07-20:action'
  when '60000000-0000-4000-8000-000000000003' then 'repeated-issue:northgate-civic-center:added-backing:action'
end
where risk_id in (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  '60000000-0000-4000-8000-000000000003'
);
