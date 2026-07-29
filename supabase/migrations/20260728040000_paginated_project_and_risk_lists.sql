create or replace function public.list_portfolio_projects_page(
  requested_organization_id uuid,
  search_query text default '',
  stage_filter text default 'all',
  sort_key text default 'exposure',
  page_size integer default 20,
  page_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with risk_aggregates as (
    select
      r.project_id,
      count(*) filter (
        where r.status not in ('resolved', 'dismissed')
      )::integer as open_risk_count,
      coalesce(sum(r.potential_exposure_cents) filter (
        where r.status not in ('resolved', 'dismissed')
      ), 0)::bigint as exposure_cents,
      count(*) filter (
        where r.status not in ('resolved', 'dismissed')
          and r.severity in ('high', 'critical')
      )::integer as elevated_risk_count,
      count(*) filter (
        where r.status not in ('resolved', 'dismissed')
          and r.detected_at >= now() - interval '7 days'
      )::integer as current_risk_count,
      count(*) filter (
        where r.status not in ('resolved', 'dismissed')
          and r.detected_at >= now() - interval '14 days'
          and r.detected_at < now() - interval '7 days'
      )::integer as previous_risk_count,
      max(r.updated_at) filter (
        where r.status not in ('resolved', 'dismissed')
      ) as latest_risk_activity
    from public.risks r
    where r.organization_id = requested_organization_id
    group by r.project_id
  ),
  enriched as (
    select
      p.id,
      p.image_url,
      p.name,
      p.project_number,
      concat_ws(', ', nullif(p.city, ''), nullif(p.state_code, '')) as location,
      p.status::text as stage,
      p.projected_margin_cents,
      p.contract_value_cents,
      case
        when p.contract_value_cents is not null
          and p.contract_value_cents <> 0
        then (p.projected_margin_cents::numeric / p.contract_value_cents) * 100
        else null
      end as forecast_margin_percent,
      coalesce(a.open_risk_count, 0) as open_risk_count,
      coalesce(a.exposure_cents, 0) as exposure_cents,
      coalesce(a.elevated_risk_count, 0) as elevated_risk_count,
      case
        when coalesce(a.elevated_risk_count, 0) > 0
          or p.projected_margin_cents < 0 then 'at_risk'
        when coalesce(a.open_risk_count, 0) > 0 then 'watch'
        else 'on_track'
      end as health,
      least(
        100,
        coalesce(a.elevated_risk_count, 0) * 25
          + greatest(
              0,
              coalesce(a.open_risk_count, 0)
                - coalesce(a.elevated_risk_count, 0)
            ) * 10
      )::integer as risk_score,
      case
        when coalesce(a.current_risk_count, 0) = 0
          and coalesce(a.previous_risk_count, 0) = 0 then 'insufficient'
        when coalesce(a.current_risk_count, 0)
          > coalesce(a.previous_risk_count, 0) then 'rising'
        when coalesce(a.current_risk_count, 0)
          < coalesce(a.previous_risk_count, 0) then 'improving'
        else 'steady'
      end as risk_trend,
      case
        when p.status = 'complete' then 'complete'
        when p.status = 'on_hold' then 'paused'
        when p.target_completion_date is not null
          and p.target_completion_date < current_date then 'delayed'
        when p.status = 'planning' then 'planned'
        else 'on_track'
      end as schedule,
      p.target_completion_date,
      coalesce(important.summary,
        'No active project risk currently requires attention.'
      ) as ai_summary,
      greatest(
        p.updated_at,
        coalesce(a.latest_risk_activity, p.updated_at)
      ) as recent_activity
    from public.projects p
    left join risk_aggregates a on a.project_id = p.id
    left join lateral (
      select r.summary
      from public.risks r
      where r.organization_id = requested_organization_id
        and r.project_id = p.id
        and r.status not in ('resolved', 'dismissed')
      order by
        case r.severity
          when 'critical' then 4
          when 'high' then 3
          when 'medium' then 2
          else 1
        end desc,
        r.potential_exposure_cents desc,
        r.id
      limit 1
    ) important on true
    where p.organization_id = requested_organization_id
      and public.is_organization_member(
        requested_organization_id,
        (select auth.uid())
      )
      and (
        stage_filter = 'all'
        or p.status::text = stage_filter
      )
      and (
        coalesce(trim(search_query), '') = ''
        or concat_ws(
          ' ',
          p.name,
          p.project_number,
          p.city,
          p.state_code
        ) ilike '%' || trim(search_query) || '%'
      )
  ),
  totals as (
    select
      count(*)::integer as total_count,
      count(*) filter (where stage = 'active')::integer as active_count,
      count(*) filter (where health = 'at_risk')::integer as at_risk_count,
      count(*) filter (
        where elevated_risk_count > 0
      )::integer as risk_at_risk_count,
      coalesce(sum(exposure_cents), 0)::bigint as total_exposure_cents,
      avg(forecast_margin_percent) filter (
        where forecast_margin_percent is not null
      ) as average_margin_percent
    from enriched
  ),
  requested_page as (
    select *
    from enriched
    order by
      case when sort_key = 'margin' then projected_margin_cents end asc
        nulls last,
      case when sort_key = 'name' then lower(name) end asc,
      case when sort_key = 'activity' then recent_activity end desc,
      case when sort_key = 'exposure' then exposure_cents end desc,
      id asc
    limit least(greatest(page_size, 1), 100)
    offset greatest(page_offset, 0)
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(
        to_jsonb(requested_page)
        order by
          case when sort_key = 'margin'
            then projected_margin_cents end asc nulls last,
          case when sort_key = 'name' then lower(name) end asc,
          case when sort_key = 'activity' then recent_activity end desc,
          case when sort_key = 'exposure' then exposure_cents end desc,
          id asc
      )
      from requested_page
    ), '[]'::jsonb),
    'total', totals.total_count,
    'summary', jsonb_build_object(
      'activeCount', totals.active_count,
      'atRiskCount', totals.at_risk_count,
      'riskAtRiskCount', totals.risk_at_risk_count,
      'totalExposureCents', totals.total_exposure_cents,
      'averageMarginPercent', totals.average_margin_percent
    )
  )
  from totals;
$$;

create or replace function public.list_portfolio_risks_page(
  requested_organization_id uuid,
  view_filter text default 'active',
  search_query text default '',
  category_filter text default 'all',
  severity_filter text default 'all',
  status_filter text default 'all',
  project_filter text default 'all',
  due_filter text default 'all',
  sort_key text default 'exposure',
  page_size integer default 20,
  page_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      r.*,
      case when p.id is null then null else jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'project_number', p.project_number
      ) end as project
    from public.risks r
    left join public.projects p
      on p.id = r.project_id
      and p.organization_id = requested_organization_id
    where r.organization_id = requested_organization_id
      and public.is_organization_member(
        requested_organization_id,
        (select auth.uid())
      )
      and (
        view_filter = 'all'
        or (view_filter = 'resolved' and r.status = 'resolved')
        or (
          view_filter = 'active'
          and r.status not in ('resolved', 'dismissed')
        )
      )
      and (
        coalesce(trim(search_query), '') = ''
        or concat_ws(' ', r.title, r.summary, p.name)
          ilike '%' || trim(search_query) || '%'
      )
      and (
        category_filter = 'all'
        or r.category::text = category_filter
      )
      and (
        severity_filter = 'all'
        or r.severity::text = severity_filter
      )
      and (
        status_filter = 'all'
        or r.status::text = status_filter
      )
      and (
        project_filter = 'all'
        or r.project_id::text = project_filter
        or p.name ilike '%' || trim(project_filter) || '%'
      )
      and (
        due_filter = 'all'
        or (due_filter = 'none' and r.due_at is null)
        or (
          due_filter = 'overdue'
          and r.due_at < now()
          and r.status not in ('resolved', 'dismissed')
        )
        or (
          due_filter = '7_days'
          and r.due_at >= now()
          and r.due_at <= now() + interval '7 days'
        )
        or (
          due_filter = '30_days'
          and r.due_at >= now()
          and r.due_at <= now() + interval '30 days'
        )
      )
  ),
  totals as (
    select count(*)::integer as total_count from filtered
  ),
  requested_page as (
    select *
    from filtered
    order by
      case when sort_key = 'confidence' then confidence_score end desc,
      case when sort_key = 'severity' then
        case severity
          when 'critical' then 4
          when 'high' then 3
          when 'medium' then 2
          else 1
        end
      end desc,
      case when sort_key = 'due' then due_at end asc nulls last,
      case when sort_key = 'detected' then detected_at end desc,
      case when sort_key = 'exposure' then potential_exposure_cents end desc,
      id asc
    limit least(greatest(page_size, 1), 100)
    offset greatest(page_offset, 0)
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(
        to_jsonb(requested_page)
        order by
          case when sort_key = 'confidence'
            then confidence_score end desc,
          case when sort_key = 'severity' then
            case severity
              when 'critical' then 4
              when 'high' then 3
              when 'medium' then 2
              else 1
            end
          end desc,
          case when sort_key = 'due' then due_at end asc nulls last,
          case when sort_key = 'detected' then detected_at end desc,
          case when sort_key = 'exposure'
            then potential_exposure_cents end desc,
          id asc
      )
      from requested_page
    ), '[]'::jsonb),
    'total', totals.total_count
  )
  from totals;
$$;

create or replace function public.get_resolution_value_summary(
  requested_organization_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with current_resolutions as (
    select distinct on (resolution.risk_id)
      resolution.risk_id,
      resolution.exposure_before_cents,
      resolution.remaining_exposure_cents,
      resolution.estimated_loss_avoided_cents,
      resolution.resolved_at,
      risk.detected_at
    from public.risk_resolutions resolution
    join public.risks risk
      on risk.id = resolution.risk_id
      and risk.organization_id = requested_organization_id
      and risk.status = 'resolved'
    where resolution.organization_id = requested_organization_id
      and resolution.reopened_at is null
      and public.is_organization_member(
        requested_organization_id,
        (select auth.uid())
      )
    order by resolution.risk_id, resolution.resolved_at desc
  )
  select jsonb_build_object(
    'risksResolved', count(*)::integer,
    'estimatedExposureReducedCents', coalesce(sum(greatest(
      0,
      exposure_before_cents - remaining_exposure_cents
    )), 0)::bigint,
    'estimatedLossAvoidedCents',
      coalesce(sum(estimated_loss_avoided_cents), 0)::bigint,
    'averageResolutionHours', coalesce(round(avg(greatest(
      0,
      extract(epoch from (resolved_at - detected_at)) / 3600
    ))), 0)::integer
  )
  from current_resolutions;
$$;

revoke all on function public.list_portfolio_projects_page(
  uuid, text, text, text, integer, integer
) from public;
revoke all on function public.get_resolution_value_summary(uuid) from public;
revoke all on function public.list_portfolio_risks_page(
  uuid, text, text, text, text, text, text, text, text, integer, integer
) from public;

grant execute on function public.list_portfolio_projects_page(
  uuid, text, text, text, integer, integer
) to authenticated, service_role;
grant execute on function public.get_resolution_value_summary(uuid)
  to authenticated, service_role;
grant execute on function public.list_portfolio_risks_page(
  uuid, text, text, text, text, text, text, text, text, integer, integer
) to authenticated, service_role;

create index if not exists projects_organization_status_name_idx
  on public.projects (organization_id, status, name, id);
create index if not exists risks_organization_project_status_idx
  on public.risks (organization_id, project_id, status, id);
create index if not exists risks_organization_due_status_idx
  on public.risks (organization_id, due_at, status, id);
