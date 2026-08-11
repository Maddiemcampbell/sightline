import "server-only";

import { aggregatePortfolioFinancials } from "@/features/financial-analytics/calculations";
import { ForecastService } from "@/features/financial-analytics/forecast-service";
import { FinancialAnalyticsRepository } from "@/features/financial-analytics/repository";
import { RiskAnalyticsRepository } from "@/features/risk-analytics/repository";
import { RiskAnalyticsService } from "@/features/risk-analytics/service";
import type {
  ForecastCommitment,
  ForecastingView,
  ForecastProject,
} from "@/features/forecasting/types";
import {
  assertAuthorized,
  canViewFinancialExposure,
  canViewProject,
  canViewRisk,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getForecastingView(): Promise<ForecastingView> {
  const context = await requireActorContext();
  assertAuthorized(canViewProject(context));
  assertAuthorized(canViewRisk(context));
  const canViewFinancials = canViewFinancialExposure(context);
  const client = await createServerSupabaseClient();
  const now = new Date();
  const riskAnalyticsPromise = new RiskAnalyticsService(
    new RiskAnalyticsRepository(client),
  ).getOrganizationAnalytics({ context, now });
  const [riskAnalytics, actionsResult, risksResult, usersResult] =
    await Promise.all([
      riskAnalyticsPromise,
      client
        .from("recommended_actions")
        .select("id,risk_id,title,status,priority,owner_user_id,due_at")
        .eq("organization_id", context.organizationId)
        .order("due_at", { ascending: true, nullsFirst: false }),
      client
        .from("risks")
        .select("id,project_id")
        .eq("organization_id", context.organizationId),
      client
        .from("users")
        .select("id,full_name")
        .eq("organization_id", context.organizationId),
    ]);
  for (const result of [actionsResult, risksResult, usersResult])
    if (result.error) throw new Error(result.error.message);

  const projectNames = new Map(
    riskAnalytics.heatmap.map((row) => [row.projectId, row.projectName]),
  );
  const projectByRisk = new Map(
    (risksResult.data ?? []).map((risk) => [risk.id, risk.project_id]),
  );
  const userNames = new Map(
    (usersResult.data ?? []).map((user) => [user.id, user.full_name]),
  );
  const horizon = new Date(now.getTime() + 90 * 86_400_000);
  const commitments: ForecastCommitment[] = (actionsResult.data ?? [])
    .filter(
      (action) =>
        action.due_at &&
        !["completed", "dismissed"].includes(action.status) &&
        new Date(action.due_at) <= horizon,
    )
    .slice(0, 8)
    .map((action) => {
      const projectId = projectByRisk.get(action.risk_id) ?? null;
      return {
        id: action.id,
        title: action.title,
        projectName: projectId ? (projectNames.get(projectId) ?? null) : null,
        dueAt: action.due_at!,
        priority: action.priority,
        ownerName: action.owner_user_id
          ? (userNames.get(action.owner_user_id) ?? null)
          : null,
        href: `/actions?search=${encodeURIComponent(action.title)}`,
      };
    });

  const worseningDrivers = riskAnalytics.drivers
    .filter((driver) => driver.trendState === "worsening")
    .slice(0, 4)
    .map((driver) => ({
      label: driver.label,
      trendPercent: driver.trendPercent,
      activeRiskCount: driver.activeRiskCount,
    }));
  const worseningCategories = new Set(
    riskAnalytics.drivers
      .filter((driver) => driver.trendState === "worsening")
      .map((driver) => driver.category),
  );
  const rankedRisks = riskAnalytics.executiveRisks.filter((risk) =>
    worseningCategories.size ? worseningCategories.has(risk.category) : true,
  );
  const worseningRisks = rankedRisks.slice(0, 5).map((risk) => ({
    id: risk.riskId,
    projectId: risk.projectId,
    title: risk.title,
    category: risk.category.replaceAll("_", " "),
    severity: risk.severity,
    attentionScore: risk.attentionScore,
    exposureCents: risk.exposureCents,
    href: risk.href,
  }));

  if (!canViewFinancials) {
    const projects = riskAnalytics.heatmap.map((row): ForecastProject => {
      const schedule = row.cells.find((cell) => cell.category === "schedule");
      return {
        id: row.projectId,
        name: row.projectName,
        currencyCode: null,
        quality: "unavailable",
        budgetVarianceCents: null,
        budgetVariancePercent: null,
        forecastMarginPercent: null,
        estimateAtCompletionCents: null,
        forecastCostToCompleteCents: null,
        pendingChangeOrdersCents: 0,
        targetCompletionDate: null,
        scheduleRiskCount: schedule?.activeRiskCount ?? 0,
        highestScheduleSeverity: schedule?.highestSeverity ?? null,
      };
    });
    return {
      canViewFinancials: false,
      generatedAt: now.toISOString(),
      currencyCode: null,
      portfolio: null,
      cash: null,
      projects,
      worseningRisks,
      worseningDrivers,
      commitments,
      readiness: {
        confidence: "unavailable",
        missingInputs: ["financial_access"],
        projectsWithoutCompletionDate: projects.length,
        projectsMissingFinancialData: projects.length,
      },
    };
  }

  const repository = new FinancialAnalyticsRepository(client);
  const [{ projects: inputs, cashEvents }, snapshots] = await Promise.all([
    repository.retrieveOrganization(context.organizationId),
    repository.getSnapshots(context.organizationId, 3),
  ]);
  const portfolio = aggregatePortfolioFinancials(inputs, now);
  const forecastService = new ForecastService();
  const monthly = forecastService.generate({
    projects: inputs,
    cashEvents,
    period: "monthly",
    now,
  });
  const day30 = forecastService.generate({
    projects: inputs,
    cashEvents,
    period: "rolling_30_days",
    now,
  });
  const day90 = forecastService.generate({
    projects: inputs,
    cashEvents,
    period: "rolling_90_days",
    now,
  });
  const day60 = forecastService.generate({
    projects: inputs,
    cashEvents,
    period: "rolling_60_days",
    now,
  });
  const inputByProject = new Map(
    inputs.map((input) => [input.projectId, input]),
  );
  const scheduleByProject = new Map(
    riskAnalytics.heatmap.map((row) => [
      row.projectId,
      row.cells.find((cell) => cell.category === "schedule"),
    ]),
  );
  const projects = portfolio.projects
    .map((project): ForecastProject => {
      const input = inputByProject.get(project.projectId);
      const schedule = scheduleByProject.get(project.projectId);
      return {
        id: project.projectId,
        name: project.projectName,
        currencyCode: project.currencyCode,
        quality: project.quality,
        budgetVarianceCents: project.budgetVariance.valueCents,
        budgetVariancePercent: project.budgetVariancePercent,
        forecastMarginPercent: project.forecastMarginPercent,
        estimateAtCompletionCents: project.estimateAtCompletion.valueCents,
        forecastCostToCompleteCents: project.forecastCostToComplete.valueCents,
        pendingChangeOrdersCents: project.pendingChangeOrders.valueCents ?? 0,
        targetCompletionDate: input?.targetCompletionDate ?? null,
        scheduleRiskCount: schedule?.activeRiskCount ?? 0,
        highestScheduleSeverity: schedule?.highestSeverity ?? null,
      };
    })
    .sort((a, b) => projectPriority(b) - projectPriority(a));
  const missingInputs = [
    ...new Set([
      ...portfolio.metadata.missingInputs,
      ...monthly.metadata.missingInputs,
      ...(snapshots.length ? [] : ["prior_financial_snapshot"]),
    ]),
  ];
  return {
    canViewFinancials: true,
    generatedAt: now.toISOString(),
    currencyCode: portfolio.currencyCode,
    portfolio: {
      quality: portfolio.quality,
      budgetVarianceCents: portfolio.netBudgetVariance.valueCents,
      budgetVariancePercent: portfolio.budgetVariancePercent,
      forecastMarginPercent: portfolio.forecastMarginPercent,
      projectsOverBudget: portfolio.projectsOverBudget,
      projectsMissingFinancialData: portfolio.projectsMissingFinancialData,
    },
    cash: {
      monthly,
      day30,
      day60,
      day90,
      confidence: monthly.confidence,
    },
    projects,
    worseningRisks,
    worseningDrivers,
    commitments,
    readiness: {
      confidence: monthly.confidence,
      missingInputs,
      projectsWithoutCompletionDate: inputs.filter(
        (project) => !project.targetCompletionDate,
      ).length,
      projectsMissingFinancialData: portfolio.projectsMissingFinancialData,
    },
  };
}

function projectPriority(project: ForecastProject) {
  const variance = project.budgetVarianceCents ?? 0;
  const severity = { critical: 4, high: 3, medium: 2, low: 1 }[
    project.highestScheduleSeverity ?? "low"
  ];
  return (variance < 0 ? Math.abs(variance) : 0) + severity * 10_000_000;
}
