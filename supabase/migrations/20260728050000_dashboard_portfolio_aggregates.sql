create or replace function public.dashboard_severity_from_rank(rank integer)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case rank
    when 4 then 'critical'
    when 3 then 'high'
    when 2 then 'medium'
    when 1 then 'low'
    else null
  end;
$$;

create or replace function public.get_dashboard_portfolio_aggregates(
  requested_organization_id uuid,
  requested_now timestamptz default now()
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with access_context as (
    select
      public.current_organization_role(requested_organization_id) is not null
        as has_access,
      public.current_organization_role(requested_organization_id) = 'owner'
        as can_view_financials
  ),
  accessible_projects as materialized (
    select project.*
    from public.projects project
    cross join access_context access
    where access.has_access
      and project.organization_id = requested_organization_id
      and public.can_access_project(project.organization_id, project.id)
  ),
  active_projects as materialized (
    select *
    from accessible_projects
    where status = 'active'
  ),
  recent_escalations as materialized (
    select distinct activity.risk_id
    from public.risk_activities activity
    where activity.organization_id = requested_organization_id
      and activity.occurred_at >= requested_now - interval '2 days'
      and activity.occurred_at <= requested_now
      and (
        activity.activity_type = 'severity_changed'
        or (
          activity.activity_type = 'status_changed'
          and activity.to_status = 'action_needed'
        )
      )
  ),
  open_risks as materialized (
    select
      risk.*,
      (
        case risk.severity
          when 'critical' then 40
          when 'high' then 28
          when 'medium' then 14
          else 4
        end
        + least(
            25::numeric,
            case when access.can_view_financials
              then risk.potential_exposure_cents::numeric / 2000000
              else 0
            end
          )
        + case
            when risk.due_at is null then 0
            when risk.due_at < requested_now then 20
            when risk.due_at <= requested_now + interval '1 day' then 16
            when risk.due_at <= requested_now + interval '7 days' then 9
            else 0
          end
        + case when risk.assigned_user_id is null then 12 else 0 end
        + case when escalation.risk_id is not null then 10 else 0 end
        + (risk.confidence_score::numeric / 100) * 8
        + case risk.status
            when 'action_needed' then 8
            when 'in_progress' then 4
            else 0
          end
      ) as attention_score,
      case
        when risk.category in ('schedule', 'weather') then 'schedule'
        when risk.category = 'financial' then 'budget'
        when risk.category in ('vendor', 'safety') then 'resources'
        when risk.category in ('contract', 'insurance') then 'contracts'
        else 'design'
      end as heatmap_group
    from public.risks risk
    cross join access_context access
    left join recent_escalations escalation on escalation.risk_id = risk.id
    where access.has_access
      and risk.organization_id = requested_organization_id
      and risk.status not in ('resolved', 'dismissed')
      and (
        risk.project_id is null
        or exists (
          select 1
          from accessible_projects project
          where project.id = risk.project_id
        )
      )
  ),
  project_risk_aggregates as (
    select
      risk.project_id,
      count(*)::integer as open_risk_count,
      coalesce(sum(
        case when access.can_view_financials
          then risk.potential_exposure_cents else 0 end
      ), 0)::bigint as exposure_cents,
      count(*) filter (
        where risk.detected_at >= requested_now - interval '7 days'
          and risk.detected_at <= requested_now
      )::integer as current_risk_count,
      count(*) filter (
        where risk.detected_at >= requested_now - interval '14 days'
          and risk.detected_at < requested_now - interval '7 days'
      )::integer as previous_risk_count
    from open_risks risk
    cross join access_context access
    where risk.project_id is not null
    group by risk.project_id
  ),
  portfolio_rows as materialized (
    select
      project.id,
      project.name,
      coalesce(
        nullif(concat_ws(', ', project.city, project.state_code), ''),
        'Location unavailable'
      ) as location,
      case when access.can_view_financials
        then project.contract_value_cents else null end as contract_value_cents,
      case when access.can_view_financials
        then project.projected_margin_cents else 0 end as projected_margin_cents,
      coalesce(aggregate.open_risk_count, 0) as open_risk_count,
      coalesce(aggregate.exposure_cents, 0) as exposure_cents,
      case
        when coalesce(aggregate.current_risk_count, 0) = 0
          and coalesce(aggregate.previous_risk_count, 0) = 0 then 'insufficient'
        when coalesce(aggregate.current_risk_count, 0)
          > coalesce(aggregate.previous_risk_count, 0) then 'up'
        when coalesce(aggregate.current_risk_count, 0)
          < coalesce(aggregate.previous_risk_count, 0) then 'down'
        else 'steady'
      end as trend,
      top_risk.title as top_issue,
      (
        coalesce(aggregate.exposure_cents, 0)::numeric / 1000000
        + coalesce(aggregate.open_risk_count, 0) * 10
        + case
            when access.can_view_financials
              and project.projected_margin_cents < 0 then 30
            else 0
          end
      ) as concern_score
    from active_projects project
    cross join access_context access
    left join project_risk_aggregates aggregate
      on aggregate.project_id = project.id
    left join lateral (
      select risk.title
      from open_risks risk
      where risk.project_id = project.id
      order by risk.attention_score desc, risk.title, risk.id
      limit 1
    ) top_risk on true
  ),
  driver_rows as (
    select
      risk.category::text as category,
      initcap(replace(risk.category::text, '_', ' ')) as label,
      count(*)::integer as risk_count,
      coalesce(sum(
        case when access.can_view_financials
          then risk.potential_exposure_cents else 0 end
      ), 0)::bigint as exposure_cents,
      case
        when max(case risk.severity
          when 'critical' then 4 when 'high' then 3
          when 'medium' then 2 else 1 end) >= 3 then 'high'
        when max(case risk.severity
          when 'critical' then 4 when 'high' then 3
          when 'medium' then 2 else 1 end) >= 2 then 'medium'
        else 'low'
      end as level
    from open_risks risk
    cross join access_context access
    group by risk.category
    order by count(*) desc, exposure_cents desc, label
    limit 5
  ),
  heatmap_projects as (
    select project.id, project.name
    from active_projects project
    order by project.id
    limit 6
  ),
  heatmap_values as (
    select
      project.id as project_id,
      project.name as project_name,
      risk.heatmap_group,
      max(case risk.severity
        when 'critical' then 4 when 'high' then 3
        when 'medium' then 2 when 'low' then 1 else 0 end) as severity_rank
    from heatmap_projects project
    left join open_risks risk on risk.project_id = project.id
    group by project.id, project.name, risk.heatmap_group
  ),
  heatmap_rows as (
    select
      project.id,
      project.name,
      jsonb_build_object(
        'schedule', public.dashboard_severity_from_rank(max(value.severity_rank)
          filter (where value.heatmap_group = 'schedule')),
        'budget', public.dashboard_severity_from_rank(max(value.severity_rank)
          filter (where value.heatmap_group = 'budget')),
        'resources', public.dashboard_severity_from_rank(max(value.severity_rank)
          filter (where value.heatmap_group = 'resources')),
        'contracts', public.dashboard_severity_from_rank(max(value.severity_rank)
          filter (where value.heatmap_group = 'contracts')),
        'design', public.dashboard_severity_from_rank(max(value.severity_rank)
          filter (where value.heatmap_group = 'design'))
      ) as cells
    from heatmap_projects project
    left join heatmap_values value on value.project_id = project.id
    group by project.id, project.name
  )
  select jsonb_build_object(
    'portfolio',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', row.id,
        'name', row.name,
        'location', row.location,
        'contractValueCents', row.contract_value_cents,
        'projectedMarginCents', row.projected_margin_cents,
        'openRiskCount', row.open_risk_count,
        'exposureCents', row.exposure_cents,
        'trend', row.trend,
        'topIssue', row.top_issue,
        'concernScore', row.concern_score
      ) order by row.concern_score desc, row.name)
      from portfolio_rows row
    ), '[]'::jsonb),
    'portfolioSummary', jsonb_build_object(
      'activeProjects', (select count(*) from active_projects),
      'projectsAtRisk', (
        select count(distinct risk.project_id)
        from open_risks risk
        where risk.project_id is not null
      ),
      'totalExposureCents', (
        select coalesce(sum(
          case when access.can_view_financials
            then risk.potential_exposure_cents else 0 end
        ), 0)
        from open_risks risk
        cross join access_context access
      )
    ),
    'riskDrivers',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', driver.category,
        'label', driver.label,
        'riskCount', driver.risk_count,
        'exposureCents', driver.exposure_cents,
        'level', driver.level
      ) order by driver.risk_count desc, driver.exposure_cents desc, driver.label)
      from driver_rows driver
    ), '[]'::jsonb),
    'riskHeatmap',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'projectId', row.id,
        'projectName', row.name,
        'cells', row.cells
      ) order by row.id)
      from heatmap_rows row
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_dashboard_portfolio_aggregates(
  uuid, timestamptz
) from public;
grant execute on function public.get_dashboard_portfolio_aggregates(
  uuid, timestamptz
) to authenticated, service_role;

revoke all on function public.dashboard_severity_from_rank(integer) from public;
grant execute on function public.dashboard_severity_from_rank(integer)
  to authenticated, service_role;
