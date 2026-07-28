import "server-only";

import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

const HISTORY_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "retrying",
  "timed_out",
  "skipped",
  "dead_lettered",
] as const;

export const executionHistoryQuerySchema = z.object({
  historyQ: z.string().trim().max(160).catch(""),
  historyStatus: z.enum(["all", ...HISTORY_STATUSES]).catch("all"),
  historyTrigger: z.enum(["all", "scheduled", "manual", "retry"]).catch("all"),
  historySort: z.enum(["newest", "oldest", "duration"]).catch("newest"),
  historyPage: z.coerce.number().int().positive().catch(1),
});

export type SchedulerHistoryInput = Record<string, unknown>;
export type SchedulerHistoryRow = {
  id: string;
  jobKey: string;
  jobName: string;
  status: (typeof HISTORY_STATUSES)[number];
  trigger: "scheduled" | "manual" | "retry";
  attemptNumber: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  correlationId: string;
  createdAt: string;
};

type RawExecution = {
  id: string;
  job_key: string;
  status: SchedulerHistoryRow["status"];
  trigger_type: SchedulerHistoryRow["trigger"];
  attempt_number: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  safe_error_summary: string | null;
  correlation_id: string;
  created_at: string;
};

export function buildExecutionHistory(
  executions: readonly RawExecution[],
  names: ReadonlyMap<string, string>,
  rawQuery: SchedulerHistoryInput,
) {
  const query = executionHistoryQuerySchema.parse(rawQuery);
  const search = query.historyQ.toLocaleLowerCase();
  let rows: SchedulerHistoryRow[] = executions.map((execution) => ({
    id: execution.id,
    jobKey: execution.job_key,
    jobName: names.get(execution.job_key) ?? execution.job_key,
    status: execution.status,
    trigger: execution.trigger_type,
    attemptNumber: execution.attempt_number,
    startedAt: execution.started_at,
    completedAt: execution.completed_at,
    durationMs: execution.duration_ms,
    errorMessage: execution.safe_error_summary,
    correlationId: execution.correlation_id,
    createdAt: execution.created_at,
  }));
  if (query.historyStatus !== "all")
    rows = rows.filter((row) => row.status === query.historyStatus);
  if (query.historyTrigger !== "all")
    rows = rows.filter((row) => row.trigger === query.historyTrigger);
  if (search)
    rows = rows.filter((row) =>
      [row.jobName, row.jobKey, row.errorMessage, row.correlationId].some(
        (value) => value?.toLocaleLowerCase().includes(search),
      ),
    );
  rows.sort((left, right) => {
    if (query.historySort === "duration")
      return (right.durationMs ?? -1) - (left.durationMs ?? -1);
    const direction = query.historySort === "oldest" ? 1 : -1;
    return left.createdAt.localeCompare(right.createdAt) * direction;
  });
  const pageSize = 25;
  const retryCount = rows.filter((row) => row.trigger === "retry").length;
  const deadLetterCount = rows.filter(
    (row) => row.status === "dead_lettered",
  ).length;
  return {
    query,
    rows: rows.slice(
      (query.historyPage - 1) * pageSize,
      query.historyPage * pageSize,
    ),
    total: rows.length,
    pageCount: Math.max(1, Math.ceil(rows.length / pageSize)),
    retryCount,
    deadLetterCount,
  };
}

export async function getExecutionHistory(rawQuery: SchedulerHistoryInput) {
  const client = createAdminSupabaseClient();
  const [executions, definitions] = await Promise.all([
    client
      .from("scheduler_job_executions")
      .select(
        "id,job_key,status,trigger_type,attempt_number,started_at,completed_at,duration_ms,safe_error_summary,correlation_id,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(2_000),
    client.from("scheduler_job_definitions").select("job_key,display_name"),
  ]);
  if (executions.error) throw new Error(executions.error.message);
  if (definitions.error) throw new Error(definitions.error.message);
  return buildExecutionHistory(
    executions.data ?? [],
    new Map(
      (definitions.data ?? []).map((definition) => [
        definition.job_key,
        definition.display_name,
      ]),
    ),
    rawQuery,
  );
}
