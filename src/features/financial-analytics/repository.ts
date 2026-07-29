import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CashFlowEventInput,
  ProjectFinancialInput,
} from "@/features/financial-analytics/types";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import { collectAllRows } from "@/lib/supabase/pagination";

export type FinancialProjectSource = Readonly<{
  id: string;
  name: string;
  status: string;
  contract_value_cents: number | null;
  projected_margin_cents: number;
  start_date: string | null;
  target_completion_date: string | null;
}>;

export class FinancialAnalyticsRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async retrieveOrganization(
    organizationId: string,
    projectId: string | null = null,
    preloadedProjects: readonly FinancialProjectSource[] | null = null,
  ): Promise<{
    projects: readonly ProjectFinancialInput[];
    cashEvents: readonly CashFlowEventInput[];
  }> {
    const [organizationResult, projects] = await Promise.all([
      this.client
        .from("organizations")
        .select("default_currency")
        .eq("id", organizationId)
        .single(),
      preloadedProjects
        ? Promise.resolve(
            preloadedProjects.filter(
              (project) => !projectId || project.id === projectId,
            ),
          )
        : collectAllRows((from, to) => {
            const query = this.client
              .from("projects")
              .select(
                "id,name,status,contract_value_cents,projected_margin_cents,start_date,target_completion_date",
                { count: "exact" },
              )
              .eq("organization_id", organizationId)
              .order("name")
              .order("id");
            return (projectId ? query.eq("id", projectId) : query).range(
              from,
              to,
            );
          }),
    ]);
    if (organizationResult.error)
      throw new Error(organizationResult.error.message);
    if (!projects.length) return { projects: [], cashEvents: [] };

    const [financials, changeOrders, cashEventRows] = await Promise.all([
      collectAllRows((from, to) => {
        const query = this.client
          .from("project_financials")
          .select(
            "project_id,currency_code,original_budget_cents,committed_cost_cents,actual_cost_cents,forecast_cost_to_complete_cents,data_as_of_date",
            { count: "exact" },
          )
          .eq("organization_id", organizationId)
          .order("project_id");
        return (projectId ? query.eq("project_id", projectId) : query).range(
          from,
          to,
        );
      }),
      collectAllRows((from, to) => {
        const query = this.client
          .from("financial_change_orders")
          .select("id,project_id,status,amount_cents", { count: "exact" })
          .eq("organization_id", organizationId)
          .order("id");
        return (projectId ? query.eq("project_id", projectId) : query).range(
          from,
          to,
        );
      }),
      collectAllRows((from, to) => {
        const query = this.client
          .from("financial_cash_events")
          .select(
            "id,project_id,direction,amount_cents,expected_date,source_type,confidence",
            { count: "exact" },
          )
          .eq("organization_id", organizationId)
          .order("expected_date")
          .order("id");
        return (projectId ? query.eq("project_id", projectId) : query).range(
          from,
          to,
        );
      }),
    ]);

    const financialByProject = new Map(
      financials.map((financial) => [financial.project_id, financial]),
    );
    const changeOrdersByProject = new Map<
      string,
      ProjectFinancialInput["changeOrders"][number][]
    >();
    for (const order of changeOrders) {
      const rows = changeOrdersByProject.get(order.project_id) ?? [];
      rows.push({
        id: order.id,
        status: order.status,
        amountCents: order.amount_cents,
      });
      changeOrdersByProject.set(order.project_id, rows);
    }
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
        changeOrders: changeOrdersByProject.get(project.id) ?? [],
      };
    });
    const cashEvents = cashEventRows.flatMap((event): CashFlowEventInput[] => {
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
    });
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
