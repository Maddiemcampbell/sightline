import "server-only";

import { aggregatePortfolioFinancials } from "@/features/financial-analytics/calculations";
import { FinancialAnalyticsRepository } from "@/features/financial-analytics/repository";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export class FinancialSnapshotService {
  async createMonthlySnapshot(
    organizationId: string,
    now = new Date(),
  ): Promise<{ snapshotMonth: string; created: boolean }> {
    const client = createAdminSupabaseClient();
    const repository = new FinancialAnalyticsRepository(client);
    const { projects } = await repository.retrieveOrganization(organizationId);
    const portfolio = aggregatePortfolioFinancials(projects, now);
    const snapshotMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    )
      .toISOString()
      .slice(0, 10);
    const { data: existing, error: existingError } = await client
      .from("portfolio_financial_snapshots")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("snapshot_month", snapshotMonth)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) return { snapshotMonth, created: false };
    const projectMetrics = portfolio.projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      varianceCents: project.budgetVariance.valueCents,
      quality: project.quality,
    }));
    const { error } = await client
      .from("portfolio_financial_snapshots")
      .insert({
        organization_id: organizationId,
        snapshot_month: snapshotMonth,
        currency_code: portfolio.currencyCode ?? "USD",
        active_projects: portfolio.activeProjects,
        portfolio_budget_cents: portfolio.totalPortfolioBudget.valueCents,
        forecast_cost_cents: portfolio.totalForecastCost.valueCents,
        net_budget_variance_cents: portfolio.netBudgetVariance.valueCents,
        projects_over_budget: portfolio.projectsOverBudget,
        projects_under_budget: portfolio.projectsUnderBudget,
        projects_missing_financial_data: portfolio.projectsMissingFinancialData,
        completeness: portfolio.quality,
        project_metrics: projectMetrics as Json,
        calculation_version: portfolio.metadata.calculationVersion,
        calculated_at: portfolio.metadata.calculatedAt,
      });
    if (error?.code === "23505") return { snapshotMonth, created: false };
    if (error) throw new Error(error.message);
    return { snapshotMonth, created: true };
  }
}
