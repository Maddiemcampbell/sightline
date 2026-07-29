import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { DashboardPortfolioAggregates } from "@/features/dashboard/types";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

const severitySchema = z.enum(["critical", "high", "medium", "low"]);
const heatmapCellSchema = severitySchema.nullable();

const portfolioAggregateSchema = z.object({
  portfolio: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      location: z.string(),
      contractValueCents: z.number().int().nullable(),
      projectedMarginCents: z.number().int().nullable(),
      openRiskCount: z.number().int().nonnegative(),
      exposureCents: z.number().int().nonnegative(),
      trend: z.enum(["up", "down", "steady", "insufficient"]),
      topIssue: z.string().nullable(),
      concernScore: z.number(),
    }),
  ),
  portfolioSummary: z.object({
    activeProjects: z.number().int().nonnegative(),
    projectsAtRisk: z.number().int().nonnegative(),
    totalExposureCents: z.number().int().nonnegative(),
  }),
  riskDrivers: z.array(
    z.object({
      category: z.string(),
      label: z.string(),
      riskCount: z.number().int().nonnegative(),
      exposureCents: z.number().int().nonnegative(),
      level: z.enum(["high", "medium", "low"]),
    }),
  ),
  riskHeatmap: z.array(
    z.object({
      projectId: z.uuid(),
      projectName: z.string(),
      cells: z.object({
        schedule: heatmapCellSchema,
        budget: heatmapCellSchema,
        resources: heatmapCellSchema,
        contracts: heatmapCellSchema,
        design: heatmapCellSchema,
      }),
    }),
  ),
});

export class DashboardPortfolioAggregateRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async retrieve(
    organizationId: string,
    now: Date,
  ): Promise<DashboardPortfolioAggregates> {
    const { data, error } = await this.client.rpc(
      "get_dashboard_portfolio_aggregates",
      {
        requested_organization_id: organizationId,
        requested_now: now.toISOString(),
      },
    );
    if (error) throw new Error(error.message);
    return portfolioAggregateSchema.parse(data);
  }
}

export { portfolioAggregateSchema };
