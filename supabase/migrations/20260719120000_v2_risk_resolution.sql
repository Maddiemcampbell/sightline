alter table public.risk_resolutions
  drop constraint risk_resolutions_resolution_type_check;

alter table public.risk_resolutions
  add column final_owner_user_id uuid,
  add column resolved_date date,
  add column completed_action_ids uuid[] not null default '{}'::uuid[],
  add column exposure_before_cents bigint,
  add column remaining_exposure_cents bigint,
  add column estimated_loss_avoided_cents bigint,
  add column warning_useful boolean,
  add column prediction_accurate boolean,
  add column internal_notes text,
  add column initial_prediction jsonb not null default '{}'::jsonb,
  add column reopened_at timestamptz,
  add column reopen_reason text,
  add constraint risk_resolutions_final_owner_fk
    foreign key (final_owner_user_id, organization_id)
    references public.users(id, organization_id) on delete restrict,
  add constraint risk_resolutions_exposure_before_check
    check (exposure_before_cents is null or exposure_before_cents >= 0),
  add constraint risk_resolutions_remaining_exposure_check
    check (remaining_exposure_cents is null or remaining_exposure_cents >= 0),
  add constraint risk_resolutions_loss_avoided_check
    check (estimated_loss_avoided_cents is null or estimated_loss_avoided_cents >= 0),
  add constraint risk_resolutions_exposure_order_check
    check (
      exposure_before_cents is null or remaining_exposure_cents is null
      or remaining_exposure_cents <= exposure_before_cents
    ),
  add constraint risk_resolutions_reopen_reason_check
    check (
      (reopened_at is null and reopen_reason is null)
      or (reopened_at is not null and char_length(reopen_reason) between 10 and 2000)
    );

update public.risk_resolutions
set
  resolution_type = case resolution_type
    when 'avoided' then 'prevented'
    when 'realized' then 'accepted'
    when 'unknown' then 'other'
    else resolution_type
  end,
  final_owner_user_id = resolved_by_user_id,
  resolved_date = resolved_at::date,
  exposure_before_cents = coalesce(realized_impact_cents, 0),
  remaining_exposure_cents = coalesce(realized_impact_cents, 0),
  estimated_loss_avoided_cents = 0,
  warning_useful = false,
  prediction_accurate = false,
  initial_prediction = jsonb_build_object('legacyResolution', true);

alter table public.risk_resolutions
  add constraint risk_resolutions_resolution_type_check
    check (resolution_type in (
      'prevented', 'mitigated', 'accepted', 'transferred', 'expired',
      'false_positive', 'duplicate', 'no_longer_relevant', 'other'
    )),
  alter column final_owner_user_id set not null,
  alter column resolved_date set not null,
  alter column exposure_before_cents set not null,
  alter column remaining_exposure_cents set not null,
  alter column estimated_loss_avoided_cents set not null,
  alter column warning_useful set not null,
  alter column prediction_accurate set not null;

create index risk_resolutions_organization_resolved_date_idx
  on public.risk_resolutions (organization_id, resolved_date desc, id desc)
  where reopened_at is null;

create index risk_resolutions_organization_type_idx
  on public.risk_resolutions (organization_id, resolution_type, resolved_date desc);
