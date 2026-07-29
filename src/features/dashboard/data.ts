import "server-only";

import { buildDashboardView } from "@/features/dashboard/aggregation";
import { getActivityPage } from "@/features/activity/data";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAuthorized,
  canViewFinancialExposure,
  canViewProject,
  canViewRisk,
} from "@/lib/auth/authorization";
import {
  deriveHomepageIntelligence,
  derivePortfolioObservations,
} from "@/features/portfolio-intelligence/core";
import { FinancialAnalyticsRepository } from "@/features/financial-analytics/repository";
import { FinancialAnalyticsService } from "@/features/financial-analytics/service";
import {
  calculatePortfolioRiskAnalytics,
  calculateRiskAnalyticsByProject,
} from "@/features/risk-analytics/calculations";
import { collectAllRows } from "@/lib/supabase/pagination";
import { DashboardPortfolioAggregateRepository } from "@/features/dashboard/portfolio-aggregates";
import { DashboardPerformanceProfiler } from "@/features/dashboard/performance";

export async function getDashboardView() {
  const context = await requireActorContext();
  assertAuthorized(canViewProject(context));
  assertAuthorized(canViewRisk(context));
  const canViewFinancials = canViewFinancialExposure(context);
  const client = await createServerSupabaseClient();
  const now = new Date();
  const profiler = new DashboardPerformanceProfiler();
  const [
    organizationResult,
    currentUserResult,
    projectsResult,
    riskRows,
    actionsResult,
    activitiesResult,
    resolutionsResult,
    usersResult,
    documentsResult,
    vendorsResult,
    activityPage,
    evidenceResult,
    portfolioAggregates,
  ] = await Promise.all([
    profiler.measure("query.organization", () =>
      client
        .from("organizations")
        .select("timezone")
        .eq("id", context.organizationId)
        .maybeSingle(),
    ),
    profiler.measure("query.current_user", () =>
      client
        .from("users")
        .select("id,full_name")
        .eq("organization_id", context.organizationId)
        .eq("id", context.userId)
        .maybeSingle(),
    ),
    profiler.measure("query.projects", () =>
      client
        .from("projects")
        .select("*")
        .eq("organization_id", context.organizationId),
    ),
    profiler.measure("query.risks", () =>
      collectAllRows((from, to) =>
        client
          .from("risks")
          .select("*", { count: "exact" })
          .eq("organization_id", context.organizationId)
          .order("id")
          .range(from, to),
      ),
    ),
    profiler.measure("query.actions", () =>
      client
        .from("recommended_actions")
        .select("*")
        .eq("organization_id", context.organizationId),
    ),
    profiler.measure("query.recent_risk_activity", () =>
      client
        .from("risk_activities")
        .select("*")
        .eq("organization_id", context.organizationId)
        .gte(
          "occurred_at",
          new Date(Date.now() - 14 * 86_400_000).toISOString(),
        ),
    ),
    profiler.measure("query.resolutions", () =>
      client
        .from("risk_resolutions")
        .select("*")
        .eq("organization_id", context.organizationId),
    ),
    profiler.measure("query.users", () =>
      client
        .from("users")
        .select("id,full_name")
        .eq("organization_id", context.organizationId)
        .order("full_name"),
    ),
    profiler.measure("query.document_coverage", () =>
      client
        .from("documents")
        .select("id,project_id,archived_at")
        .eq("organization_id", context.organizationId),
    ),
    profiler.measure("query.vendors", () =>
      client
        .from("vendors")
        .select("id,name")
        .eq("organization_id", context.organizationId),
    ),
    profiler.measure("query.activity_page", () =>
      getActivityPage({ limit: 20 }),
    ),
    profiler.measure("query.evidence_counts", () =>
      client
        .from("risk_evidence")
        .select("risk_id")
        .eq("organization_id", context.organizationId),
    ),
    profiler.measure("query.portfolio_aggregates", () =>
      new DashboardPortfolioAggregateRepository(client).retrieve(
        context.organizationId,
        now,
      ),
    ),
  ]);
  const results = [
    organizationResult,
    currentUserResult,
    projectsResult,
    actionsResult,
    activitiesResult,
    resolutionsResult,
    usersResult,
    documentsResult,
    vendorsResult,
    evidenceResult,
  ];
  for (const result of results)
    if (result.error) throw new Error(result.error.message);
  if (!currentUserResult.data)
    throw new Error("Authenticated application user not found.");
  const currentUser = currentUserResult.data;

  const timezone = organizationResult.data?.timezone ?? "America/Los_Angeles";
  const projects = (projectsResult.data ?? []).map((project) =>
    canViewFinancials
      ? project
      : {
          ...project,
          contract_value_cents: null,
          projected_margin_cents: 0,
        },
  );
  const risks = riskRows.map((risk) =>
    canViewFinancials
      ? risk
      : {
          ...risk,
          potential_exposure_cents: 0,
          estimated_margin_impact_cents: 0,
        },
  );
  const resolutions = (resolutionsResult.data ?? []).map((resolution) =>
    canViewFinancials
      ? resolution
      : {
          ...resolution,
          exposure_before_cents: 0,
          remaining_exposure_cents: 0,
          estimated_loss_avoided_cents: 0,
        },
  );
  const view = profiler.measureSync("derive.dashboard_view", () =>
    buildDashboardView(
      {
        now,
        currentUserId: context.userId,
        currentUser,
        projects,
        risks,
        actions: actionsResult.data ?? [],
        activities: activitiesResult.data ?? [],
        resolutions,
        users: usersResult.data ?? [],
        portfolioAggregates,
      },
      timezone,
    ),
  );
  const riskAnalytics = profiler.measureSync("derive.risk_analytics", () =>
    calculatePortfolioRiskAnalytics({
      now,
      projects,
      risks: riskRows,
      actions: actionsResult.data ?? [],
      evidence: evidenceResult.data ?? [],
      canViewFinancials,
    }),
  );
  const riskAnalyticsByProject = profiler.measureSync(
    "derive.project_risk_analytics",
    () =>
      calculateRiskAnalyticsByProject({
        now,
        projects,
        risks: riskRows,
        actions: actionsResult.data ?? [],
        evidence: evidenceResult.data ?? [],
        canViewFinancials,
      }),
  );
  const financialAnalytics = canViewFinancials
    ? await profiler.measure("derive.financial_analytics", () =>
        new FinancialAnalyticsService(
          new FinancialAnalyticsRepository(client),
        ).getOrganizationAnalytics({
          context,
          preloadedProjects: projectsResult.data ?? [],
        }),
      )
    : null;
  const meaningfulActivityTypes = new Set([
    "risk_detected",
    "risk_acknowledged",
    "status_changed",
    "severity_changed",
    "owner_assigned",
    "due_date_changed",
    "action_accepted",
    "action_started",
    "action_completed",
    "action_dismissed",
    "evidence_added",
    "document_uploaded",
    "email_marked_sent",
    "comment_added",
    "risk_resolved",
    "risk_reopened",
    "system_analysis_completed",
  ]);
  const observations = profiler
    .measureSync("derive.portfolio_observations", () =>
      derivePortfolioObservations({
        projects,
        risks,
        actions: actionsResult.data ?? [],
        documents: documentsResult.data ?? [],
        vendors: vendorsResult.data ?? [],
        now,
      }),
    )
    .map((observation) =>
      canViewFinancials
        ? observation
        : {
            ...observation,
            businessImpactEstimateCents: null,
            businessImpactExplanation:
              "Financial impact is hidden because this role does not have permission to view financial exposure.",
          },
    );
  const intelligence = profiler.measureSync(
    "derive.homepage_intelligence",
    () =>
      deriveHomepageIntelligence({
        observations,
        projects,
        risks,
        resolutions,
        now,
      }),
  );
  profiler.report();
  return {
    ...view,
    canViewFinancials,
    financialAnalytics,
    riskAnalytics,
    riskAnalyticsByProject,
    riskDrivers: riskAnalytics.drivers.slice(0, 5).map((driver) => ({
      category: driver.category,
      label: driver.label,
      riskCount: driver.activeRiskCount,
      exposureCents: driver.assessedExposureCents ?? 0,
      level:
        driver.highCriticalCount > 0
          ? ("high" as const)
          : driver.averageAttentionScore >= 50
            ? ("medium" as const)
            : ("low" as const),
    })),
    portfolioSummary: {
      ...view.portfolioSummary,
      forecastMarginPercent:
        financialAnalytics?.portfolio.forecastMarginPercent ?? null,
    },
    observations,
    intelligence,
    activity: activityPage.items
      .filter((item) => meaningfulActivityTypes.has(item.activityType))
      .slice(0, 8),
  };
}
