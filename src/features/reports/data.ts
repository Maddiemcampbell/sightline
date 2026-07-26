import "server-only";

import { FinancialAnalyticsRepository } from "@/features/financial-analytics/repository";
import { FinancialAnalyticsService } from "@/features/financial-analytics/service";
import { canViewFinancialExposure } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getReportsData() {
  const context = await requireActorContext();
  if (!canViewFinancialExposure(context)) return { financialAnalytics: null };
  const client = await createServerSupabaseClient();
  return {
    financialAnalytics: await new FinancialAnalyticsService(
      new FinancialAnalyticsRepository(client),
    ).getOrganizationAnalytics({ context }),
  };
}
