import { runRegisteredCronJob } from "@/features/scheduler/cron-route";

export const runtime = "nodejs";
export const GET = (request: Request) =>
  runRegisteredCronJob(request, "customer-data-exports");
