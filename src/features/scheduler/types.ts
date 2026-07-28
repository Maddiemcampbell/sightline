import type { Json } from "@/lib/supabase/database.types";

export type SchedulerTrigger = "scheduled" | "manual" | "retry";
export type SchedulerStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "retrying"
  | "timed_out"
  | "skipped";

export type SchedulerContext = Readonly<{
  executionId: string;
  correlationId: string;
  signal: AbortSignal;
  scheduledFor: string | null;
}>;

export type SchedulerHandler = (
  context: SchedulerContext,
) => Promise<Readonly<Record<string, Json>>>;

export type RegisteredJob = Readonly<{
  key: string;
  name: string;
  description: string;
  cron: string;
  enabled: boolean;
  timeoutMs: number;
  retry: Readonly<{ maximumRetries: number; backoffMs: number }>;
  concurrency: "forbid";
  handler: SchedulerHandler;
}>;

export type TriggerJobInput = Readonly<{
  jobKey: string;
  trigger: SchedulerTrigger;
  scheduledFor?: string | null;
  initiatingOperatorId?: string | null;
  parentExecutionId?: string | null;
  rootExecutionId?: string | null;
  attemptNumber?: number;
}>;

export class NonRetryableSchedulerError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "NonRetryableSchedulerError";
    this.code = code;
  }
}
