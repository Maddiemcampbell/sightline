import { describe, expect, it } from "vitest";

import { FinancialAnalyticsRepository } from "@/features/financial-analytics/repository";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryResult = {
  data: Record<string, unknown>[] | Record<string, unknown> | null;
  error: null;
  count: number | null;
};

type QueryTrace = {
  table: string;
  filters: Readonly<Record<string, unknown>>;
  from: number | null;
  to: number | null;
};

class FakeQuery implements PromiseLike<QueryResult> {
  private readonly filters: Record<string, unknown> = {};
  private fromIndex: number | null = null;
  private toIndex: number | null = null;
  private exactCount = false;

  constructor(
    private readonly table: string,
    private readonly rows: readonly Record<string, unknown>[],
    private readonly traces: QueryTrace[],
    private readonly onIn: () => void,
  ) {}

  select(_columns: string, options?: { count?: string }) {
    this.exactCount = options?.count === "exact";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }

  order(_column: string) {
    void _column;
    return this;
  }

  range(from: number, to: number) {
    this.fromIndex = from;
    this.toIndex = to;
    return this;
  }

  in(_column: string, _values: readonly unknown[]) {
    void _column;
    void _values;
    this.onIn();
    return this;
  }

  async single(): Promise<QueryResult> {
    const result = this.filteredRows()[0] ?? null;
    return { data: result, error: null, count: result ? 1 : 0 };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult> {
    const filtered = this.filteredRows();
    this.traces.push({
      table: this.table,
      filters: { ...this.filters },
      from: this.fromIndex,
      to: this.toIndex,
    });
    const from = this.fromIndex ?? 0;
    const to = this.toIndex ?? filtered.length - 1;
    return {
      data: filtered.slice(from, to + 1),
      error: null,
      count: this.exactCount ? filtered.length : null,
    };
  }

  private filteredRows() {
    return this.rows.filter((row) =>
      Object.entries(this.filters).every(
        ([column, value]) => row[column] === value,
      ),
    );
  }
}

describe("FinancialAnalyticsRepository", () => {
  it("retrieves 1,200 projects completely without serializing project IDs into queries", async () => {
    const organizationId = "organization-1";
    const projects = Array.from({ length: 1_200 }, (_, index) => ({
      id: `project-${index}`,
      organization_id: organizationId,
      name: `Project ${index}`,
      status: "active",
      contract_value_cents: 10_000_000,
      projected_margin_cents: 1_000_000,
      start_date: "2026-01-01",
      target_completion_date: "2026-12-31",
    }));
    const financials = projects.map((project) => ({
      organization_id: organizationId,
      project_id: project.id,
      currency_code: "USD",
      original_budget_cents: 8_000_000,
      committed_cost_cents: 6_000_000,
      actual_cost_cents: 4_000_000,
      forecast_cost_to_complete_cents: 3_000_000,
      data_as_of_date: "2026-07-28",
    }));
    const changeOrders = projects.flatMap((project, index) =>
      [0, 1].map((suffix) => ({
        id: `change-${index}-${suffix}`,
        organization_id: organizationId,
        project_id: project.id,
        status: "approved",
        amount_cents: 10_000,
      })),
    );
    const cashEvents = projects.map((project, index) => ({
      id: `cash-${index}`,
      organization_id: organizationId,
      project_id: project.id,
      direction: "inflow",
      amount_cents: 100_000,
      expected_date: "2026-08-01",
      source_type: "payment_schedule",
      confidence: "high",
    }));
    const tables: Record<string, readonly Record<string, unknown>[]> = {
      organizations: [{ id: organizationId, default_currency: "USD" }],
      projects,
      project_financials: financials,
      financial_change_orders: changeOrders,
      financial_cash_events: cashEvents,
    };
    const traces: QueryTrace[] = [];
    let inCalls = 0;
    const client = {
      from: (table: string) =>
        new FakeQuery(table, tables[table] ?? [], traces, () => {
          inCalls += 1;
        }),
    } as unknown as SupabaseClient<AppDatabase>;

    const result = await new FinancialAnalyticsRepository(
      client,
    ).retrieveOrganization(organizationId);

    expect(result.projects).toHaveLength(1_200);
    expect(result.cashEvents).toHaveLength(1_200);
    expect(
      result.projects.every((project) => project.changeOrders.length === 2),
    ).toBe(true);
    expect(inCalls).toBe(0);
    expect(
      traces.every((trace) =>
        trace.table === "organizations"
          ? trace.filters.id === organizationId
          : trace.filters.organization_id === organizationId,
      ),
    ).toBe(true);
    expect(
      traces
        .filter((trace) => trace.from !== null && trace.to !== null)
        .every((trace) => (trace.to ?? 0) - (trace.from ?? 0) + 1 <= 1_000),
    ).toBe(true);
  });
});
