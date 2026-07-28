import { cronSecretMatches } from "@/features/detection/cron-auth";
import { runScheduledOrganizationJobs } from "@/features/background-jobs/runners";
import { getServerEnv } from "@/lib/env";
import { detectLongRunningJobs } from "@/features/job-monitoring/alerts";
import { reportError } from "@/features/observability/service";

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
    const longRunningJobs = await detectLongRunningJobs();
    const summary = await runScheduledOrganizationJobs("portfolio_refresh");
    return Response.json({
      ok: summary.failed === 0,
      longRunningJobs,
      ...summary,
    });
  } catch (error) {
    await reportError({
      error,
      source: "api",
      headers: request.headers,
      requestPath: new URL(request.url).pathname,
      requestMethod: request.method,
      metadata: { operation: "portfolio_intelligence_cron" },
    });
    return Response.json(
      { error: "Portfolio intelligence refresh failed." },
      { status: 500 },
    );
  }
}
