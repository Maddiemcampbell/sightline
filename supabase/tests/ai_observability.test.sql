begin;
select plan(11);

select has_table(
  'public', 'ai_observability_events',
  'central AI observability events exist'
);
select is(
  (select relrowsecurity from pg_class
   where oid = 'public.ai_observability_events'::regclass),
  true,
  'AI observability events use RLS'
);
select has_column(
  'public', 'ai_observability_events', 'model_name',
  'model usage is recorded'
);
select has_column(
  'public', 'ai_observability_events', 'latency_ms',
  'latency is recorded'
);
select has_column(
  'public', 'ai_observability_events', 'total_tokens',
  'token usage is recorded'
);
select has_column(
  'public', 'ai_observability_events', 'retrieval_candidate_count',
  'retrieval coverage denominator is recorded'
);
select has_column(
  'public', 'ai_observability_events', 'evidence_cited_count',
  'evidence coverage numerator is recorded'
);
select has_column(
  'public', 'ai_risk_suggestions', 'review_context',
  'pending review context is separated from telemetry'
);
select is(
  (select count(*)::integer
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'ai_observability_events'
     and column_name in (
       'prompt', 'raw_prompt', 'question', 'answer', 'excerpt',
       'document_content', 'input_snapshot', 'output_snapshot'
     )),
  0,
  'telemetry schema cannot store prompts or customer content'
);
select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = 'ai_observability_events'
     and policyname = 'ai_observability_events_member_insert'),
  1,
  'organization members can append scoped telemetry'
);
select is(
  (select count(*)::integer
   from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name = 'ai_observability_events'
     and grantee = 'authenticated'
     and privilege_type = 'SELECT'),
  0,
  'customer sessions cannot read observability events'
);

select * from finish();
rollback;
