import "server-only";

import { FinancialAnalyticsRepository } from "@/features/financial-analytics/repository";
import { FinancialAnalyticsService } from "@/features/financial-analytics/service";
import { canViewFinancialExposure } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RiskAnalyticsRepository } from "@/features/risk-analytics/repository";
import { RiskAnalyticsService } from "@/features/risk-analytics/service";

export async function getReportsData() {
  const context = await requireActorContext();
  const client = await createServerSupabaseClient();
  const riskAnalytics = await new RiskAnalyticsService(
    new RiskAnalyticsRepository(client),
  ).getOrganizationAnalytics({ context });
  if (!canViewFinancialExposure(context))
    return { financialAnalytics: null, riskAnalytics };
  return {
    financialAnalytics: await new FinancialAnalyticsService(
      new FinancialAnalyticsRepository(client),
    ).getOrganizationAnalytics({ context }),
    riskAnalytics,
  };
}
