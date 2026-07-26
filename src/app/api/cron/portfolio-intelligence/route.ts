import { cronSecretMatches } from "@/features/detection/cron-auth";
import { refreshPortfolioIntelligence } from "@/features/portfolio-intelligence/service";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  runOrganizationJobsSequentially,
  uniqueOrganizationJobTargets,
} from "@/lib/tenancy/organization-jobs";
import { FinancialSnapshotService } from "@/features/financial-analytics/snapshot-service";
import { RiskSnapshotService } from "@/features/risk-analytics/snapshot-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!secret)
    return Response.json({ error: "Cron is not configured." }, { status: 503 });
  if (!supplied || !cronSecretMatches(secret, supplied))
    return Response.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("organization_memberships")
      .select("organization_id,application_user_id")
      .order("created_at");
    if (error) throw new Error(error.message);
    const organizations = await runOrganizationJobsSequentially(
      uniqueOrganizationJobTargets(data ?? []),
      async (target) => {
        const [intelligence, financialSnapshot, riskSnapshot] = await Promise.all([
          refreshPortfolioIntelligence(target.organizationId),
          new FinancialSnapshotService().createMonthlySnapshot(
            target.organizationId,
          ),
          new RiskSnapshotService().createMonthlySnapshot(target.organizationId),
        ]);
        return { ...intelligence, financialSnapshot, riskSnapshot };
      },
    );
    return Response.json({ ok: true, organizations });
  } catch {
    return Response.json(
      { error: "Portfolio intelligence refresh failed." },
      { status: 500 },
    );
  }
}
