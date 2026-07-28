import { schedulerCronAuthorizationError } from "@/features/scheduler/cron-route";
import { SchedulerService } from "@/features/scheduler/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorizationError = schedulerCronAuthorizationError(request);
  if (authorizationError) return authorizationError;
  try {
    const executions = await new SchedulerService().runDue();
    return Response.json({
      ok: !executions.some((execution) =>
        ["failed", "timed_out"].includes(execution.status),
      ),
      executions,
    });
  } catch {
    return Response.json(
      { error: "Scheduler invocation failed." },
      { status: 500 },
    );
  }
}
