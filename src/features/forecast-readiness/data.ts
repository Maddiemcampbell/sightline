import "server-only";

import {
  calculateProjectReadiness,
  confidenceFor,
} from "@/features/forecast-readiness/calculate";
import type { ForecastReadinessCenter } from "@/features/forecast-readiness/types";
import { getForecastingView } from "@/features/forecasting/data";
import {
  canManageIntegrations,
  canViewFinancialExposure,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getForecastReadinessCenter(): Promise<ForecastReadinessCenter> {
  const context = await requireActorContext();
  const forecast = await getForecastingView();
  const client = await createServerSupabaseClient();
  const canViewFinancials = canViewFinancialExposure(context);
  const canManage = canManageIntegrations(context);
  const [
    financialsResult,
    cashResult,
    connectionsResult,
    procoreMappingsResult,
    microsoftMappingsResult,
    rulesResult,
  ] = await Promise.all([
    client
      .from("project_financials")
      .select(
        "project_id,original_budget_cents,committed_cost_cents,actual_cost_cents,forecast_cost_to_complete_cents,data_as_of_date",
      )
      .eq("organization_id", context.organizationId),
    client
      .from("financial_cash_events")
      .select("project_id")
      .eq("organization_id", context.organizationId),
    client
      .from("integration_connections")
      .select(
        "id,provider,company_name,status,last_successful_sync_at,created_at",
      )
      .eq("organization_id", context.organizationId),
    client
      .from("integration_project_mappings")
      .select("mapping_status,sightline_project_id")
      .eq("organization_id", context.organizationId),
    client
      .from("microsoft365_library_mappings")
      .select("selected,project_id")
      .eq("organization_id", context.organizationId),
    client
      .from("exception_alert_rules")
      .select("forecast_stale_days,sync_stale_hours")
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
  ]);
  for (const result of [
    financialsResult,
    cashResult,
    connectionsResult,
    procoreMappingsResult,
    microsoftMappingsResult,
    rulesResult,
  ])
    if (result.error) throw new Error(result.error.message);

  const now = new Date();
  const staleAfterDays = rulesResult.data?.forecast_stale_days ?? 14;
  const syncStaleHours = rulesResult.data?.sync_stale_hours ?? 24;
  const financialByProject = new Map(
    (financialsResult.data ?? []).map((row) => [row.project_id, row]),
  );
  const cashProjects = new Set(
    (cashResult.data ?? []).map((row) => row.project_id),
  );
  const sourcesByProject = new Map<string, Set<string>>();
  for (const mapping of procoreMappingsResult.data ?? [])
    if (
      mapping.sightline_project_id &&
      ["mapped", "created"].includes(mapping.mapping_status)
    )
      addSource(sourcesByProject, mapping.sightline_project_id, "Procore");
  for (const mapping of microsoftMappingsResult.data ?? [])
    if (mapping.selected && mapping.project_id)
      addSource(sourcesByProject, mapping.project_id, "Microsoft 365");

  const projects = canViewFinancials
    ? forecast.projects
        .map((project) => {
          const financial = financialByProject.get(project.id);
          return calculateProjectReadiness(
            {
              id: project.id,
              name: project.name,
              targetCompletionDate: project.targetCompletionDate,
              forecastMarginPercent: project.forecastMarginPercent,
              originalBudgetCents: financial?.original_budget_cents ?? null,
              committedCostCents: financial?.committed_cost_cents ?? null,
              actualCostCents: financial?.actual_cost_cents ?? null,
              forecastCostToCompleteCents:
                financial?.forecast_cost_to_complete_cents ?? null,
              dataAsOfDate: financial?.data_as_of_date ?? null,
              hasDatedCashEvents: cashProjects.has(project.id),
              connectedSources: [...(sourcesByProject.get(project.id) ?? [])],
            },
            now,
            staleAfterDays,
          );
        })
        .sort(
          (left, right) =>
            left.score - right.score || left.name.localeCompare(right.name),
        )
    : [];

  const procoreConsidered = (procoreMappingsResult.data ?? []).filter(
    (row) => row.mapping_status !== "skipped",
  );
  const microsoftConsidered = (microsoftMappingsResult.data ?? []).filter(
    (row) => row.selected,
  );
  const mappedObjects =
    procoreConsidered.filter((row) =>
      ["mapped", "created"].includes(row.mapping_status),
    ).length + microsoftConsidered.filter((row) => row.project_id).length;
  const unmappedObjects =
    procoreConsidered.filter((row) =>
      ["suggested", "unmapped"].includes(row.mapping_status),
    ).length + microsoftConsidered.filter((row) => !row.project_id).length;
  const integrations = (connectionsResult.data ?? []).map((connection) => {
    const syncReference =
      connection.last_successful_sync_at ?? connection.created_at;
    return {
      id: connection.id,
      provider: connection.provider,
      name: connection.company_name,
      status: connection.status,
      lastSuccessfulSyncAt: connection.last_successful_sync_at,
      stale:
        connection.status !== "disconnected" &&
        now.getTime() - new Date(syncReference).getTime() >
          syncStaleHours * 3_600_000,
    };
  });
  const totalAuthoritative = projects.reduce(
    (total, project) => total + project.authoritativeValues,
    0,
  );
  const score = projects.length
    ? Math.round(
        projects.reduce((total, project) => total + project.score, 0) /
          projects.length,
      )
    : 0;
  const staleProjects = projects.filter(
    (project) =>
      project.staleDays === null || project.staleDays > staleAfterDays,
  ).length;
  const projectsWithMissingInputs = projects.filter(
    (project) => project.missingInputs.length > 0,
  ).length;
  const recommendations: ForecastReadinessCenter["recommendations"] = [
    ...(projectsWithMissingInputs
      ? [
          {
            priority: "high" as const,
            title: "Complete required project inputs",
            detail: `${projectsWithMissingInputs} project${projectsWithMissingInputs === 1 ? " is" : "s are"} missing financial or schedule inputs used by forecasting.`,
            href: "#project-readiness",
          },
        ]
      : []),
    ...(integrations.some((connection) => connection.stale)
      ? [
          {
            priority: "high" as const,
            title: "Restore stale synchronization",
            detail:
              "At least one connected provider has not completed a successful synchronization within the configured window.",
            href: "/integrations",
          },
        ]
      : []),
    ...(unmappedObjects
      ? [
          {
            priority: "medium" as const,
            title: "Map discovered integration objects",
            detail: `${unmappedObjects} selected or discovered object${unmappedObjects === 1 ? " is" : "s are"} not connected to a Sightline project.`,
            href: "/integrations",
          },
        ]
      : []),
    ...(projects.some((project) => project.estimatedValues.length)
      ? [
          {
            priority: "medium" as const,
            title: "Replace estimated cash timing",
            detail:
              "Add dated cash events for projects where remaining costs are currently distributed as estimates.",
            href: "/forecasts",
          },
        ]
      : []),
  ];

  return {
    generatedAt: now.toISOString(),
    canViewFinancials,
    canManageIntegrations: canManage,
    staleAfterDays,
    score,
    confidence: confidenceFor(score, totalAuthoritative),
    projects,
    summary: {
      readyProjects: projects.filter((project) => project.confidence === "high")
        .length,
      staleProjects,
      projectsWithMissingInputs,
      authoritativeValues: totalAuthoritative,
      estimatedValues: projects.reduce(
        (total, project) => total + project.estimatedValues.length,
        0,
      ),
    },
    integrations,
    mapping: {
      discoveredObjects: procoreConsidered.length + microsoftConsidered.length,
      mappedObjects,
      unmappedObjects,
    },
    recommendations,
  };
}

function addSource(
  sources: Map<string, Set<string>>,
  projectId: string,
  source: string,
) {
  const projectSources = sources.get(projectId) ?? new Set<string>();
  projectSources.add(source);
  sources.set(projectId, projectSources);
}
