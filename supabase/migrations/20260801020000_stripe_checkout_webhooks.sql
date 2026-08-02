alter table public.organization_billing_accounts
  add column provider_checkout_session_id text,
  add column checkout_url text check (
    checkout_url is null or checkout_url ~ '^https://checkout\.stripe\.com/'
  );

create unique index organization_billing_accounts_stripe_checkout_idx
  on public.organization_billing_accounts (provider_checkout_session_id)
  where provider = 'stripe' and provider_checkout_session_id is not null;

create or replace function public.claim_stripe_billing_event(
  supplied_provider_event_id text,
  supplied_event_type text,
  supplied_access_request_id uuid,
  supplied_correlation_id uuid,
  supplied_safe_metadata jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_event_id uuid;
begin
  insert into public.billing_provider_events (
    provider, provider_event_id, access_request_id, event_type,
    processing_status, safe_metadata, correlation_id
  ) values (
    'stripe', supplied_provider_event_id, supplied_access_request_id,
    supplied_event_type, 'received', supplied_safe_metadata,
    supplied_correlation_id
  )
  on conflict (provider, provider_event_id) do update
    set processing_status = 'received',
        safe_metadata = excluded.safe_metadata
    where public.billing_provider_events.processing_status = 'failed'
  returning id into claimed_event_id;

  return claimed_event_id is not null;
end;
$$;

revoke all on function public.claim_stripe_billing_event(text, text, uuid, uuid, jsonb)
  from public;
grant execute on function public.claim_stripe_billing_event(text, text, uuid, uuid, jsonb)
  to service_role;
