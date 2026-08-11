import { describe, expect, it } from "vitest";

import {
  aggregatePortfolioFinancials,
  calculateProjectFinancials,
  compareFinancialValues,
} from "@/features/financial-analytics/calculations";
import { ForecastService } from "@/features/financial-analytics/forecast-service";
import { compareWithPreviousSnapshot } from "@/features/financial-analytics/service";
import { FinancialAnalyticsService } from "@/features/financial-analytics/service";
import type { ProjectFinancialInput } from "@/features/financial-analytics/types";

const NOW = new Date("2026-07-25T12:00:00Z");

function project(
  overrides: Partial<ProjectFinancialInput> = {},
): ProjectFinancialInput {
  return {
    projectId: "project-1",
    projectName: "Project One",
    status: "active",
    currencyCode: "USD",
    contractValueCents: 2_000_00,
    projectedMarginCents: 200_00,
    startDate: "2026-01-01",
    targetCompletionDate: "2026-12-31",
    originalBudgetCents: 1_000_00,
    committedCostCents: 800_00,
    actualCostCents: 600_00,
    forecastCostToCompleteCents: 400_00,
    dataAsOfDate: "2026-07-24",
    changeOrders: [
      {
        id: "approved-1",
        status: "approved",
        amountCents: 100_00,
      },
      { id: "pending-1", status: "pending", amountCents: 50_00 },
    ],
    ...overrides,
  };
}

describe("financial analytics", () => {
  it("uses approved budget minus estimate at completion for variance", () => {
    const result = calculateProjectFinancials(project(), NOW);
    expect(result.approvedBudget.valueCents).toBe(1_100_00);
    expect(result.pendingChangeOrders.valueCents).toBe(50_00);
    expect(result.estimateAtCompletion.valueCents).toBe(1_000_00);
    expect(result.budgetVariance.valueCents).toBe(100_00);
    expect(result.budgetVariancePercent).toBe(9.09);
    expect(result.varianceDirection).toBe("under_budget");
  });

  it("uses integer-cent arithmetic without floating point drift", () => {
    const result = calculateProjectFinancials(
      project({
        originalBudgetCents: 9_000_000_000_001,
        actualCostCents: 4_000_000_000_001,
        forecastCostToCompleteCents: 4_000_000_000_001,
        changeOrders: [{ id: "approved", status: "approved", amountCents: 3 }],
      }),
      NOW,
    );
    expect(result.approvedBudget.valueCents).toBe(9_000_000_000_004);
    expect(result.estimateAtCompletion.valueCents).toBe(8_000_000_000_002);
    expect(result.budgetVariance.valueCents).toBe(1_000_000_000_002);
  });

  it("marks missing inputs rather than coercing them to zero", () => {
    const result = calculateProjectFinancials(
      project({
        originalBudgetCents: null,
        committedCostCents: null,
        actualCostCents: null,
        forecastCostToCompleteCents: null,
        changeOrders: [],
      }),
      NOW,
    );
    expect(result.quality).toBe("missing");
    expect(result.approvedBudget.valueCents).toBeNull();
    expect(result.budgetVariance.valueCents).toBeNull();
    expect(result.budgetVariance.metadata.missingInputs).toContain(
      "estimate_at_completion_cents",
    );
  });

  it("aggregates amounts and calculates weighted portfolio percentages", () => {
    const result = aggregatePortfolioFinancials(
      [
        project(),
        project({
          projectId: "project-2",
          projectName: "Project Two",
          originalBudgetCents: 9_000_00,
          actualCostCents: 5_000_00,
          forecastCostToCompleteCents: 5_000_00,
          changeOrders: [],
        }),
      ],
      NOW,
    );
    expect(result.totalPortfolioBudget.valueCents).toBe(10_100_00);
    expect(result.totalForecastCost.valueCents).toBe(11_000_00);
    expect(result.netBudgetVariance.valueCents).toBe(-900_00);
    expect(result.budgetVariancePercent).toBe(-8.91);
    expect(result.projectsOverBudget).toBe(1);
    expect(result.projectsUnderBudget).toBe(1);
  });

  it("does not aggregate incompatible currencies", () => {
    const result = aggregatePortfolioFinancials(
      [project(), project({ projectId: "project-2", currencyCode: "CAD" })],
      NOW,
    );
    expect(result.quality).toBe("unavailable");
    expect(result.currencyCode).toBeNull();
    expect(result.netBudgetVariance.valueCents).toBeNull();
    expect(result.metadata.missingInputs).toContain("consistent_currency");
  });

  it("creates scheduled cash buckets with source-driven confidence", () => {
    const result = new ForecastService().generate({
      projects: [project()],
      cashEvents: [
        {
          id: "payment-1",
          projectId: "project-1",
          projectName: "Project One",
          direction: "inflow",
          amountCents: 80_00,
          expectedDate: "2026-08-10",
          sourceType: "payment_schedule",
          confidence: "high",
        },
        {
          id: "commitment-1",
          projectId: "project-1",
          projectName: "Project One",
          direction: "outflow",
          amountCents: 30_00,
          expectedDate: "2026-08-12",
          sourceType: "commitment",
          confidence: "medium",
        },
      ],
      now: NOW,
    });
    expect(result.buckets[1]?.expectedInflows.valueCents).toBe(80_00);
    expect(result.buckets[1]?.expectedOutflows.valueCents).toBe(30_00);
    expect(result.buckets[1]?.netCashFlow.valueCents).toBe(50_00);
    expect(result.confidence).toBe("medium");
    expect(result.projectsDrivingIncomingRevenue[0]?.projectName).toBe(
      "Project One",
    );
  });

  it("uses a clearly estimated low-confidence fallback for unscheduled costs", () => {
    const result = new ForecastService().generate({
      projects: [
        project({
          forecastCostToCompleteCents: 60_01,
          targetCompletionDate: "2026-09-30",
        }),
      ],
      cashEvents: [],
      now: NOW,
    });
    expect(result.confidence).toBe("low");
    expect(
      result.buckets.slice(0, 3).every((bucket) => bucket.isEstimated),
    ).toBe(true);
    expect(
      result.buckets
        .slice(0, 3)
        .reduce(
          (total, bucket) => total + (bucket.expectedOutflows.valueCents ?? 0),
          0,
        ),
    ).toBe(60_01);
  });

  it("supports a rolling 60-day lookahead", () => {
    const result = new ForecastService().generate({
      projects: [project()],
      cashEvents: [
        {
          id: "day-60-inflow",
          projectId: "project-1",
          projectName: "Project One",
          direction: "inflow",
          amountCents: 25_00,
          expectedDate: "2026-08-15",
          sourceType: "payment_schedule",
          confidence: "high",
        },
      ],
      period: "rolling_60_days",
      now: NOW,
    });
    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      startsOn: "2026-07-25",
      endsOn: "2026-09-22",
    });
    expect(result.buckets[0]?.expectedInflows.valueCents).toBe(25_00);
  });

  it("compares values with explicit direction and missing-history handling", () => {
    expect(compareFinancialValues(-20_00, -50_00)).toMatchObject({
      absoluteChange: 30_00,
      direction: "improved",
    });
    expect(compareFinancialValues(10_00, null).direction).toBe("unavailable");
  });

  it("identifies projects that improved and deteriorated since the prior month", () => {
    const current = aggregatePortfolioFinancials(
      [
        project(),
        project({
          projectId: "project-2",
          projectName: "Project Two",
          originalBudgetCents: 900_00,
          actualCostCents: 600_00,
          forecastCostToCompleteCents: 500_00,
          changeOrders: [],
        }),
      ],
      NOW,
    );
    const comparison = compareWithPreviousSnapshot(
      current,
      [
        {
          id: "snapshot-1",
          organization_id: "organization-1",
          snapshot_month: "2026-06-01",
          currency_code: "USD",
          active_projects: 2,
          portfolio_budget_cents: 1_900_00,
          forecast_cost_cents: 2_050_00,
          net_budget_variance_cents: -150_00,
          projects_over_budget: 1,
          projects_under_budget: 1,
          projects_missing_financial_data: 0,
          completeness: "complete",
          project_metrics: [
            {
              projectId: "project-1",
              projectName: "Project One",
              varianceCents: 50_00,
            },
            {
              projectId: "project-2",
              projectName: "Project Two",
              varianceCents: -100_00,
            },
          ],
          calculation_version: "financial-analytics-v1",
          calculated_at: "2026-06-30T00:00:00Z",
          created_at: "2026-06-30T00:00:00Z",
        },
      ],
      NOW,
    );
    expect(comparison.projectsImproved).toContain("Project One");
    expect(comparison.projectsDeteriorated).toContain("Project Two");
    expect(comparison.netBudgetVariance.previousValue).toBe(-150_00);
  });

  it("rejects financial retrieval before querying for an unauthorized role", async () => {
    let queried = false;
    const repository = {
      retrieveOrganization: async () => {
        queried = true;
        return { projects: [], cashEvents: [] };
      },
      getSnapshots: async () => [],
    };
    const service = new FinancialAnalyticsService(repository as never);
    await expect(
      service.getOrganizationAnalytics({
        context: {
          organizationId: "organization-1",
          organizationRole: "manager",
          authUserId: "auth-user-1",
          userId: "user-1",
          role: "project_manager",
        },
      }),
    ).rejects.toThrow("Resource not found");
    expect(queried).toBe(false);
  });
});
