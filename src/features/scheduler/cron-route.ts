import "server-only";

import { SchedulerService } from "./service";
import { cronSecretMatches } from "@/features/detection/cron-auth";
import { getServerEnv } from "@/lib/env";

export async function runRegisteredCronJob(request: Request, jobKey: string) {
  const authorizationError = schedulerCronAuthorizationError(request);
  if (authorizationError) return authorizationError;
  const scheduledFor = new Date();
  scheduledFor.setUTCSeconds(0, 0);
  try {
    const execution = await new SchedulerService().trigger({
      jobKey,
      trigger: "scheduled",
      scheduledFor: scheduledFor.toISOString(),
    });
    return Response.json({
      ok: execution.status === "succeeded" || execution.status === "skipped",
      executionId: execution.id,
      status: execution.status,
      correlationId: execution.correlationId,
    });
  } catch {
    return Response.json(
      { error: "Scheduled execution failed." },
      { status: 500 },
    );
  }
}

export function schedulerCronAuthorizationError(
  request: Request,
): Response | null {
  const secret = getServerEnv().CRON_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!secret)
    return Response.json({ error: "Cron is not configured." }, { status: 503 });
  if (!supplied || !cronSecretMatches(secret, supplied))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  return null;
}
