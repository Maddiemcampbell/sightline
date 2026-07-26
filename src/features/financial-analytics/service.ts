import "server-only";

import {
  aggregatePortfolioFinancials,
  compareFinancialValues,
} from "@/features/financial-analytics/calculations";
import { ForecastService } from "@/features/financial-analytics/forecast-service";
import { FinancialAnalyticsRepository } from "@/features/financial-analytics/repository";
import type {
  ForecastPeriod,
  PortfolioFinancialComparison,
} from "@/features/financial-analytics/types";
import {
  assertAuthorized,
  canViewFinancialExposure,
  type ActorContext,
} from "@/lib/auth/authorization";

export class FinancialAnalyticsService {
  constructor(
    private readonly repository: FinancialAnalyticsRepository,
    private readonly forecastService = new ForecastService(),
  ) {}

  async getOrganizationAnalytics({
    context,
    projectId = null,
    forecastPeriod = "monthly",
    now = new Date(),
  }: {
    context: ActorContext;
    projectId?: string | null;
    forecastPeriod?: ForecastPeriod;
    now?: Date;
  }) {
    assertAuthorized(canViewFinancialExposure(context));
    const [{ projects, cashEvents }, snapshots] = await Promise.all([
      this.repository.retrieveOrganization(context.organizationId, projectId),
      projectId
        ? Promise.resolve([])
        : this.repository.getSnapshots(context.organizationId, 3),
    ]);
    const portfolio = aggregatePortfolioFinancials(projects, now);
    return {
      portfolio,
      cashFlow: this.forecastService.generate({
        projects,
        cashEvents,
        period: forecastPeriod,
        now,
      }),
      comparison: compareWithPreviousSnapshot(portfolio, snapshots, now),
    };
  }
}

type Snapshot = Awaited<
  ReturnType<FinancialAnalyticsRepository["getSnapshots"]>
>[number];

export function compareWithPreviousSnapshot(
  current: ReturnType<typeof aggregatePortfolioFinancials>,
  snapshots: readonly Snapshot[],
  now = new Date(),
): PortfolioFinancialComparison {
  const currentMonth = monthStart(now);
  const previous = snapshots.find(
    (snapshot) => snapshot.snapshot_month < currentMonth,
  );
  if (!previous)
    return {
      currentMonth,
      previousMonth: null,
      netBudgetVariance: compareFinancialValues(
        current.netBudgetVariance.valueCents,
        null,
      ),
      portfolioBudget: compareFinancialValues(
        current.totalPortfolioBudget.valueCents,
        null,
      ),
      forecastCost: compareFinancialValues(
        current.totalForecastCost.valueCents,
        null,
        false,
      ),
      projectsImproved: [],
      projectsDeteriorated: [],
      newProjects: [],
      completedProjects: [],
      quality: "unavailable",
    };
  const priorProjects = parseProjectMetrics(previous.project_metrics);
  const currentById = new Map(
    current.projects.map((project) => [project.projectId, project]),
  );
  const priorById = new Map(
    priorProjects.map((project) => [project.projectId, project]),
  );
  const projectsImproved: string[] = [];
  const projectsDeteriorated: string[] = [];
  for (const project of current.projects) {
    const prior = priorById.get(project.projectId);
    const variance = project.budgetVariance.valueCents;
    if (!prior || variance === null || prior.varianceCents === null) continue;
    if (variance > prior.varianceCents)
      projectsImproved.push(project.projectName);
    else if (variance < prior.varianceCents)
      projectsDeteriorated.push(project.projectName);
  }
  return {
    currentMonth,
    previousMonth: previous.snapshot_month,
    netBudgetVariance: compareFinancialValues(
      current.netBudgetVariance.valueCents,
      previous.net_budget_variance_cents,
    ),
    portfolioBudget: compareFinancialValues(
      current.totalPortfolioBudget.valueCents,
      previous.portfolio_budget_cents,
    ),
    forecastCost: compareFinancialValues(
      current.totalForecastCost.valueCents,
      previous.forecast_cost_cents,
      false,
    ),
    projectsImproved,
    projectsDeteriorated,
    newProjects: current.projects
      .filter((project) => !priorById.has(project.projectId))
      .map((project) => project.projectName),
    completedProjects: priorProjects
      .filter((project) => !currentById.has(project.projectId))
      .map((project) => project.projectName),
    quality: current.quality === "complete" ? previous.completeness : "partial",
  };
}

function parseProjectMetrics(value: unknown): readonly {
  projectId: string;
  projectName: string;
  varianceCents: number | null;
}[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("projectId" in entry) ||
      typeof entry.projectId !== "string" ||
      !("projectName" in entry) ||
      typeof entry.projectName !== "string"
    )
      return [];
    const varianceCents =
      "varianceCents" in entry &&
      (typeof entry.varianceCents === "number" || entry.varianceCents === null)
        ? entry.varianceCents
        : null;
    return [
      {
        projectId: entry.projectId,
        projectName: entry.projectName,
        varianceCents,
      },
    ];
  });
}

function monthStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}
