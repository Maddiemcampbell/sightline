alter table public.risk_evidence rename column description to why_it_matters;
alter table public.risk_evidence rename column source_excerpt to excerpt;
alter table public.risk_evidence rename column observed_at to occurred_at;

alter table public.risk_evidence
  add column evidence_type text,
  add column source_label text,
  add column source_location text,
  add column page_number integer check (page_number is null or page_number > 0),
  add column line_start integer check (line_start is null or line_start > 0),
  add column line_end integer check (line_end is null or line_end > 0),
  add column relevance_score smallint,
  add column support_type text not null default 'direct'
    check (support_type in ('direct', 'inferred', 'assumption'));

update public.risk_evidence evidence
set evidence_type = case
      when evidence.detection_key like 'insurance:%' then 'insurance_expiration'
      when evidence.detection_key like 'weather:%' then 'weather_event'
      when evidence.detection_key like 'repeated-issue:%' then 'daily_log_entry'
      when evidence.document_id is not null then 'document_excerpt'
      else 'system_rule'
    end,
    source_label = coalesce(
      (select document.name from public.documents document where document.id = evidence.document_id),
      evidence.title
    ),
    excerpt = coalesce(nullif(trim(evidence.excerpt), ''), evidence.why_it_matters),
    relevance_score = 90;

alter table public.risk_evidence
  alter column evidence_type set not null,
  alter column source_label set not null,
  alter column excerpt set not null,
  alter column relevance_score set not null,
  add constraint risk_evidence_type_check check (evidence_type in (
    'document_excerpt', 'contract_clause', 'insurance_expiration',
    'daily_log_entry', 'weather_event', 'schedule_event', 'project_metadata',
    'historical_risk', 'manual_note', 'system_rule'
  )),
  add constraint risk_evidence_relevance_check check (relevance_score between 0 and 100),
  add constraint risk_evidence_line_range_check check (
    line_start is null or line_end is null or line_end >= line_start
  );

create index risk_evidence_organization_risk_relevance_idx
  on public.risk_evidence (organization_id, risk_id, relevance_score desc, occurred_at desc);
create index risk_evidence_organization_document_idx
  on public.risk_evidence (organization_id, document_id)
  where document_id is not null;
