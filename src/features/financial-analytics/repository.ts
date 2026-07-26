import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CashFlowEventInput,
  ProjectFinancialInput,
} from "@/features/financial-analytics/types";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class FinancialAnalyticsRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async retrieveOrganization(
    organizationId: string,
    projectId: string | null = null,
  ): Promise<{
    projects: readonly ProjectFinancialInput[];
    cashEvents: readonly CashFlowEventInput[];
  }> {
    const projectQuery = this.client
      .from("projects")
      .select(
        "id,name,status,contract_value_cents,projected_margin_cents,start_date,target_completion_date",
      )
      .eq("organization_id", organizationId)
      .order("name");
    if (projectId) projectQuery.eq("id", projectId);
    const [organizationResult, projectsResult] = await Promise.all([
      this.client
        .from("organizations")
        .select("default_currency")
        .eq("id", organizationId)
        .single(),
      projectQuery,
    ]);
    if (organizationResult.error)
      throw new Error(organizationResult.error.message);
    if (projectsResult.error) throw new Error(projectsResult.error.message);
    const projects = projectsResult.data ?? [];
    const projectIds = projects.map((project) => project.id);
    if (!projectIds.length) return { projects: [], cashEvents: [] };

    const [financialsResult, changeOrdersResult, cashEventsResult] =
      await Promise.all([
        this.client
          .from("project_financials")
          .select(
            "project_id,currency_code,original_budget_cents,committed_cost_cents,actual_cost_cents,forecast_cost_to_complete_cents,data_as_of_date",
          )
          .eq("organization_id", organizationId)
          .in("project_id", projectIds),
        this.client
          .from("financial_change_orders")
          .select("id,project_id,status,amount_cents")
          .eq("organization_id", organizationId)
          .in("project_id", projectIds),
        this.client
          .from("financial_cash_events")
          .select(
            "id,project_id,direction,amount_cents,expected_date,source_type,confidence",
          )
          .eq("organization_id", organizationId)
          .in("project_id", projectIds)
          .order("expected_date"),
      ]);
    for (const result of [
      financialsResult,
      changeOrdersResult,
      cashEventsResult,
    ])
      if (result.error) throw new Error(result.error.message);

    const financialByProject = new Map(
      (financialsResult.data ?? []).map((financial) => [
        financial.project_id,
        financial,
      ]),
    );
    const projectById = new Map(
      projects.map((project) => [project.id, project]),
    );
    const inputs = projects.map((project): ProjectFinancialInput => {
      const financial = financialByProject.get(project.id);
      return {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        currencyCode:
          financial?.currency_code ?? organizationResult.data.default_currency,
        contractValueCents: project.contract_value_cents,
        projectedMarginCents: project.projected_margin_cents,
        startDate: project.start_date,
        targetCompletionDate: project.target_completion_date,
        originalBudgetCents: financial?.original_budget_cents ?? null,
        committedCostCents: financial?.committed_cost_cents ?? null,
        actualCostCents: financial?.actual_cost_cents ?? null,
        forecastCostToCompleteCents:
          financial?.forecast_cost_to_complete_cents ?? null,
        dataAsOfDate: financial?.data_as_of_date ?? null,
        changeOrders: (changeOrdersResult.data ?? [])
          .filter((order) => order.project_id === project.id)
          .map((order) => ({
            id: order.id,
            status: order.status,
            amountCents: order.amount_cents,
          })),
      };
    });
    const cashEvents = (cashEventsResult.data ?? []).flatMap(
      (event): CashFlowEventInput[] => {
        const project = projectById.get(event.project_id);
        return project
          ? [
              {
                id: event.id,
                projectId: project.id,
                projectName: project.name,
                direction: event.direction,
                amountCents: event.amount_cents,
                expectedDate: event.expected_date,
                sourceType: event.source_type,
                confidence: event.confidence,
              },
            ]
          : [];
      },
    );
    return { projects: inputs, cashEvents };
  }

  async getSnapshots(organizationId: string, limit = 2) {
    const { data, error } = await this.client
      .from("portfolio_financial_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .order("snapshot_month", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
