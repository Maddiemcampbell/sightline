import "server-only";

import { z } from "zod";
import { expectedDurationMs } from "./alerts";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dashboardQuerySchema = z.object({
  status: z
    .enum(["all", "queued", "running", "succeeded", "failed", "unhealthy"])
    .catch("all"),
  sort: z
    .enum([
      "job",
      "status",
      "last_success",
      "last_failure",
      "duration",
      "failures",
    ])
    .catch("last_failure"),
  order: z.enum(["asc", "desc"]).catch("desc"),
  page: z.coerce.number().int().positive().catch(1),
});

export type JobDashboardRow = {
  key: string;
  organizationName: string;
  jobName: string;
  status: "queued" | "running" | "succeeded" | "failed" | "unhealthy";
  lastSuccess: string | null;
  lastFailure: string | null;
  durationMs: number | null;
  nextRun: string | null;
  failureCount: number;
  retryCount: number;
  history: Array<{
    id: string;
    status: string;
    occurredAt: string;
    durationMs: number | null;
  }>;
};

export async function getJobDashboard(
  rawQuery: Record<string, string | string[] | undefined>,
) {
  const query = dashboardQuerySchema.parse(rawQuery);
  const client = createAdminSupabaseClient();
  const [{ data: runs, error }, { data: organizations }] = await Promise.all([
    client
      .from("organization_job_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2_000),
    client.from("organizations").select("id,name"),
  ]);
  if (error) throw new Error(error.message);
  const names = new Map((organizations ?? []).map((org) => [org.id, org.name]));
  const groups = new Map<string, NonNullable<typeof runs>>();
  for (const run of runs ?? []) {
    const key = `${run.organization_id}:${run.job_type}`;
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }
  let rows: JobDashboardRow[] = [...groups.entries()].map(([key, history]) => {
    const latest = history[0]!;
    const longRunning =
      latest.status === "running" &&
      latest.started_at !== null &&
      Date.now() - new Date(latest.started_at).getTime() >
        expectedDurationMs(latest.job_type);
    return {
      key,
      organizationName:
        names.get(latest.organization_id) ?? "Unknown organization",
      jobName:
        latest.job_type === "portfolio_refresh"
          ? "Portfolio refresh"
          : "Daily executive brief",
      status: longRunning ? "unhealthy" : latest.status,
      lastSuccess:
        history.find((run) => run.status === "succeeded")?.completed_at ?? null,
      lastFailure:
        history.find((run) => run.status === "failed")?.completed_at ?? null,
      durationMs: latest.duration_ms,
      nextRun: latest.next_retry_at,
      failureCount: history.filter((run) => run.status === "failed").length,
      retryCount: history.filter((run) => run.trigger_source === "retry")
        .length,
      history: history.slice(0, 5).map((run) => ({
        id: run.id,
        status: run.status,
        occurredAt: run.started_at ?? run.created_at,
        durationMs: run.duration_ms,
      })),
    };
  });
  if (query.status !== "all")
    rows = rows.filter((row) => row.status === query.status);
  const direction = query.order === "asc" ? 1 : -1;
  rows.sort((left, right) => {
    const values: Record<
      typeof query.sort,
      [string | number | null, string | number | null]
    > = {
      job: [left.jobName, right.jobName],
      status: [left.status, right.status],
      last_success: [left.lastSuccess, right.lastSuccess],
      last_failure: [left.lastFailure, right.lastFailure],
      duration: [left.durationMs, right.durationMs],
      failures: [left.failureCount, right.failureCount],
    };
    const [a, b] = values[query.sort];
    return (
      String(a ?? "").localeCompare(String(b ?? ""), undefined, {
        numeric: true,
      }) * direction
    );
  });
  const pageSize = 20;
  return {
    query,
    rows: rows.slice((query.page - 1) * pageSize, query.page * pageSize),
    total: rows.length,
    pageCount: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
}
