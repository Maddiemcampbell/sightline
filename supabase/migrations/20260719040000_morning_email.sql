alter table public.users
  add column email_delivery_enabled boolean not null default true,
  add column preferred_delivery_time time not null default '07:00',
  add column delivery_timezone text not null default 'America/Los_Angeles';

create table public.daily_brief_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  daily_brief_id uuid not null,
  user_id uuid not null,
  delivery_kind text not null check (delivery_kind in ('scheduled', 'test')),
  provider text not null,
  provider_message_id text,
  idempotency_key text not null unique,
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  next_retry_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (daily_brief_id, organization_id)
    references public.daily_briefs(id, organization_id) on delete cascade,
  foreign key (user_id, organization_id)
    references public.users(id, organization_id) on delete cascade
);

create unique index daily_brief_deliveries_scheduled_once_idx
  on public.daily_brief_deliveries (organization_id, daily_brief_id, user_id)
  where delivery_kind = 'scheduled';

create index daily_brief_deliveries_retry_idx
  on public.daily_brief_deliveries (status, next_retry_at)
  where status in ('pending', 'failed');

create trigger daily_brief_deliveries_set_updated_at
before update on public.daily_brief_deliveries
for each row execute function public.set_updated_at();

alter table public.daily_brief_deliveries enable row level security;
revoke all on table public.daily_brief_deliveries from anon, authenticated;
grant all on table public.daily_brief_deliveries to service_role;
