alter table public.ai_risk_suggestions
  add column review_context jsonb;

-- Review context is product workflow state, not observability telemetry. Move the
-- existing context before replacing analysis snapshots with metadata-only data.
update public.ai_risk_suggestions suggestion
set review_context = run.input_snapshot
from public.ai_analysis_runs run
where run.id = suggestion.analysis_run_id
  and suggestion.review_status = 'pending';

create table public.ai_observability_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_type text not null check (operation_type in (
    'risk_analysis', 'email_draft', 'risk_question', 'organization_question'
  )),
  source_record_id uuid,
  provider text not null,
  model_name text not null,
  prompt_version text not null,
  status text not null check (status in ('success', 'fallback', 'failure')),
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  retrieval_candidate_count integer check (retrieval_candidate_count is null or retrieval_candidate_count >= 0),
  retrieval_selected_count integer check (retrieval_selected_count is null or retrieval_selected_count >= 0),
  evidence_available_count integer check (evidence_available_count is null or evidence_available_count >= 0),
  evidence_cited_count integer check (evidence_cited_count is null or evidence_cited_count >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  unique (operation_type, source_record_id),
  check (
    retrieval_candidate_count is null
    or retrieval_selected_count is null
    or retrieval_selected_count <= retrieval_candidate_count
  ),
  check (
    evidence_available_count is null
    or evidence_cited_count is null
    or evidence_cited_count <= evidence_available_count
  )
);

create index ai_observability_events_created_idx
  on public.ai_observability_events (created_at desc);
create index ai_observability_events_org_created_idx
  on public.ai_observability_events (organization_id, created_at desc);
create index ai_observability_events_status_created_idx
  on public.ai_observability_events (status, created_at desc);

alter table public.ai_observability_events enable row level security;
revoke all on table public.ai_observability_events from anon, authenticated;
grant insert on table public.ai_observability_events to authenticated;
grant all on table public.ai_observability_events to service_role;

create policy ai_observability_events_member_insert
  on public.ai_observability_events
  for insert to authenticated
  with check ((select public.is_organization_member(organization_id)));

-- Backfill privacy-safe telemetry. Unknown historical retrieval denominators stay
-- null rather than being reported as zero.
insert into public.ai_observability_events (
  organization_id, operation_type, source_record_id, provider, model_name,
  prompt_version, status, latency_ms, input_tokens, output_tokens, total_tokens,
  retrieval_candidate_count, retrieval_selected_count,
  evidence_available_count, evidence_cited_count, error_code, created_at
)
select
  organization_id,
  'risk_analysis',
  id,
  provider,
  model_name,
  prompt_version,
  case status when 'complete' then 'success' when 'fallback' then 'fallback' else 'failure' end,
  latency_ms,
  input_tokens,
  output_tokens,
  total_tokens,
  coalesce(jsonb_array_length(input_snapshot -> 'documentExcerpts'), 0)
    + coalesce(jsonb_array_length(input_snapshot -> 'existingRiskEvidence'), 0),
  coalesce(jsonb_array_length(input_snapshot -> 'documentExcerpts'), 0)
    + coalesce(jsonb_array_length(input_snapshot -> 'existingRiskEvidence'), 0),
  coalesce(jsonb_array_length(input_snapshot -> 'documentExcerpts'), 0)
    + coalesce(jsonb_array_length(input_snapshot -> 'existingRiskEvidence'), 0),
  coalesce(jsonb_array_length(output_snapshot -> 'evidenceReferencesUsed'), 0),
  case when status in ('failed', 'fallback') then 'provider_failure' end,
  created_at
from public.ai_analysis_runs;

insert into public.ai_observability_events (
  organization_id, operation_type, source_record_id, provider, model_name,
  prompt_version, status, latency_ms, input_tokens, output_tokens, total_tokens,
  evidence_available_count, evidence_cited_count, error_code, created_at
)
select
  organization_id, 'email_draft', id, provider, model_name, prompt_version,
  case generation_source when 'ai' then 'success' else 'fallback' end,
  latency_ms, input_tokens, output_tokens, total_tokens,
  cardinality(evidence_ids), cardinality(evidence_ids),
  case when generation_source = 'deterministic_fallback' then 'provider_failure' end,
  created_at
from public.risk_email_drafts;

insert into public.ai_observability_events (
  organization_id, operation_type, source_record_id, provider, model_name,
  prompt_version, status, latency_ms, input_tokens, output_tokens, total_tokens,
  evidence_available_count, evidence_cited_count, created_at
)
select
  organization_id, 'risk_question', id, coalesce(provider, 'unknown'),
  coalesce(model_name, 'unknown'), coalesce(prompt_version, 'unknown'),
  case when provider = 'deterministic' then 'fallback' else 'success' end,
  coalesce(latency_ms, 0), input_tokens, output_tokens, total_tokens,
  cardinality(evidence_ids), cardinality(evidence_ids), created_at
from public.risk_conversation_messages
where role = 'assistant';

-- Analysis run snapshots are operational metadata only. Full review context remains
-- on pending suggestions and is cleared when the human review is completed.
update public.ai_analysis_runs
set input_snapshot = jsonb_build_object(
      'organizationId', input_snapshot -> 'organizationId',
      'projectId', input_snapshot #> '{project,id}',
      'documentExcerptCount', coalesce(jsonb_array_length(input_snapshot -> 'documentExcerpts'), 0),
      'existingRiskEvidenceCount', coalesce(jsonb_array_length(input_snapshot -> 'existingRiskEvidence'), 0),
      'historicalRiskCount', coalesce(jsonb_array_length(input_snapshot -> 'historicalRelatedRisks'), 0)
    ),
    output_snapshot = case
      when output_snapshot is null then null
      else jsonb_build_object(
        'category', output_snapshot -> 'category',
        'severity', output_snapshot -> 'severity',
        'confidenceScore', output_snapshot -> 'confidenceScore',
        'evidenceReferenceCount', coalesce(jsonb_array_length(output_snapshot -> 'evidenceReferencesUsed'), 0)
      )
    end,
    error_message = case when error_message is null then null else 'provider_failure' end;

comment on table public.ai_observability_events is
  'Privacy-safe AI telemetry. Raw prompts, document excerpts, questions, answers, and generated content are prohibited.';
comment on column public.ai_risk_suggestions.review_context is
  'Access-controlled evidence context retained only while a suggestion awaits human review.';
