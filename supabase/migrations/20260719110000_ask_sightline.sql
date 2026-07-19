create table public.risk_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, risk_id, user_id),
  unique (id, organization_id),
  foreign key (risk_id, organization_id) references public.risks(id, organization_id) on delete cascade,
  foreign key (user_id, organization_id) references public.users(id, organization_id) on delete cascade
);

create table public.risk_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 10000),
  answer_status text check (answer_status is null or answer_status in ('answered', 'unavailable')),
  evidence_ids uuid[] not null default '{}'::uuid[],
  confidence smallint check (confidence is null or confidence between 0 and 100),
  missing_information text[] not null default '{}'::text[],
  suggested_follow_ups text[] not null default '{}'::text[],
  provider text,
  model_name text,
  prompt_version text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (conversation_id, organization_id) references public.risk_conversations(id, organization_id) on delete cascade,
  check (
    (role = 'user' and answer_status is null and confidence is null and provider is null and model_name is null and prompt_version is null)
    or (role = 'assistant' and answer_status is not null and confidence is not null and provider is not null and model_name is not null and prompt_version is not null)
  )
);

create table public.risk_answer_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null,
  user_id uuid not null,
  rating text not null check (rating in ('helpful', 'not_helpful', 'incorrect')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, user_id),
  foreign key (message_id, organization_id) references public.risk_conversation_messages(id, organization_id) on delete cascade,
  foreign key (user_id, organization_id) references public.users(id, organization_id) on delete cascade
);

create index risk_conversations_scope_idx on public.risk_conversations (organization_id, risk_id, user_id);
create index risk_conversation_messages_history_idx on public.risk_conversation_messages (organization_id, conversation_id, created_at desc, id desc);
create index risk_answer_feedback_eval_idx on public.risk_answer_feedback (organization_id, rating, created_at desc);

create trigger risk_conversations_set_updated_at before update on public.risk_conversations for each row execute function public.set_updated_at();
create trigger risk_answer_feedback_set_updated_at before update on public.risk_answer_feedback for each row execute function public.set_updated_at();

alter table public.risk_conversations enable row level security;
alter table public.risk_conversation_messages enable row level security;
alter table public.risk_answer_feedback enable row level security;
revoke all on table public.risk_conversations, public.risk_conversation_messages, public.risk_answer_feedback from anon, authenticated;
grant all on table public.risk_conversations, public.risk_conversation_messages, public.risk_answer_feedback to service_role;
