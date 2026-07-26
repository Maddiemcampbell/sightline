import "server-only";

import { NotificationRepository } from "@/features/notifications/repository";
import { organizationJobRetryAt } from "@/features/background-jobs/schedule";
import type {
  ExecuteOrganizationJobInput,
  OrganizationJobMetrics,
  OrganizationJobOutcome,
  OrganizationJobType,
} from "@/features/background-jobs/types";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const EMPTY_METRICS: OrganizationJobMetrics = {};

export async function executeOrganizationJob(
  input: ExecuteOrganizationJobInput,
  worker: () => Promise<OrganizationJobMetrics>,
  now = new Date(),
): Promise<OrganizationJobOutcome> {
  const client = createAdminSupabaseClient();
  const maxAttempts = input.maxAttempts ?? 3;
  const initial = await client
    .from("organization_job_runs")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("job_type", input.jobType)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (initial.error) throw new Error(initial.error.message);
  let run = initial.data;
  if (!run) {
    const inserted = await client
      .from("organization_job_runs")
      .insert({
        organization_id: input.organizationId,
        job_type: input.jobType,
        trigger_source: input.source,
        idempotency_key: input.idempotencyKey,
        requested_by_membership_id: input.requestedByMembershipId ?? null,
        max_attempts: maxAttempts,
        scheduled_for: input.scheduledFor ?? null,
      })
      .select("*")
      .single();
    if (inserted.error) {
      const existing = await client
        .from("organization_job_runs")
        .select("*")
        .eq("organization_id", input.organizationId)
        .eq("job_type", input.jobType)
        .eq("idempotency_key", input.idempotencyKey)
        .single();
      if (existing.error) throw new Error(existing.error.message);
      run = existing.data;
    } else run = inserted.data;
  }

  if (
    run.status === "succeeded" ||
    run.status === "running" ||
    run.attempt_count >= run.max_attempts ||
    (run.next_retry_at && new Date(run.next_retry_at) > now)
  ) {
    return {
      id: run.id,
      organizationId: input.organizationId,
      status: "skipped",
      attemptCount: run.attempt_count,
      metrics: EMPTY_METRICS,
    };
  }

  const attemptCount = run.attempt_count + 1;
  const startedAt = new Date();
  const claimed = await client
    .from("organization_job_runs")
    .update({
      status: "running",
      trigger_source: run.attempt_count > 0 ? ("retry" as const) : input.source,
      attempt_count: attemptCount,
      started_at: startedAt.toISOString(),
      completed_at: null,
      duration_ms: null,
      error_message: null,
      next_retry_at: null,
    })
    .eq("id", run.id)
    .eq("organization_id", input.organizationId)
    .eq("attempt_count", run.attempt_count)
    .in("status", ["queued", "failed"])
    .select("id")
    .maybeSingle();
  if (claimed.error) throw new Error(claimed.error.message);
  if (!claimed.data) {
    return {
      id: run.id,
      organizationId: input.organizationId,
      status: "skipped",
      attemptCount: run.attempt_count,
      metrics: EMPTY_METRICS,
    };
  }

  try {
    const metrics = await worker();
    const durationMs = Math.max(0, Date.now() - startedAt.getTime());
    const completed = await client
      .from("organization_job_runs")
      .update({
        status: "succeeded",
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        metrics: metrics as Json,
      })
      .eq("id", run.id)
      .eq("organization_id", input.organizationId);
    if (completed.error) throw new Error(completed.error.message);
    return {
      id: run.id,
      organizationId: input.organizationId,
      status: "succeeded",
      attemptCount,
      metrics,
    };
  } catch (caught) {
    const durationMs = Math.max(0, Date.now() - startedAt.getTime());
    const retryAt = organizationJobRetryAt(
      now,
      attemptCount,
      run.max_attempts,
    );
    const message =
      caught instanceof Error ? caught.message.slice(0, 1000) : "Unknown error";
    const failed = await client
      .from("organization_job_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        error_message: message,
        next_retry_at: retryAt,
      })
      .eq("id", run.id)
      .eq("organization_id", input.organizationId);
    if (failed.error) throw new Error(failed.error.message);
    await notifyJobFailure({
      organizationId: input.organizationId,
      jobType: input.jobType,
      runId: run.id,
      attemptCount,
      maxAttempts: run.max_attempts,
      retryAt,
    });
    return {
      id: run.id,
      organizationId: input.organizationId,
      status: "failed",
      attemptCount,
      metrics: EMPTY_METRICS,
    };
  }
}

export async function listRetryableJobRuns(jobType: OrganizationJobType) {
  const { data, error } = await createAdminSupabaseClient()
    .from("organization_job_runs")
    .select("*")
    .eq("job_type", jobType)
    .eq("status", "failed")
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at")
    .limit(50);
  if (error) throw new Error(error.message);
  return data;
}

async function notifyJobFailure(input: {
  organizationId: string;
  jobType: OrganizationJobType;
  runId: string;
  attemptCount: number;
  maxAttempts: number;
  retryAt: string | null;
}) {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", input.organizationId)
    .in("role", ["owner", "administrator"]);
  if (error) throw new Error(error.message);
  const repository = new NotificationRepository(client);
  await Promise.all(
    (data ?? []).map((membership) =>
      repository.create({
        organizationId: input.organizationId,
        recipientMembershipId: membership.id,
        type: "background_job_failed",
        title: `${jobLabel(input.jobType)} failed`,
        body: input.retryAt
          ? `Attempt ${input.attemptCount} of ${input.maxAttempts} failed. Sightline will retry automatically.`
          : `All ${input.maxAttempts} attempts failed. Manual intervention is required.`,
        href: "/settings/automation",
        payload: { runId: input.runId },
      }),
    ),
  );
}

function jobLabel(jobType: OrganizationJobType) {
  return jobType === "portfolio_refresh"
    ? "Portfolio Intelligence refresh"
    : "Daily Executive Brief";
}
