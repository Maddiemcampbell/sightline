import "server-only";

import {
  executeOrganizationJob,
  listRetryableJobRuns,
} from "@/features/background-jobs/service";
import { scheduledOrganizationJob } from "@/features/background-jobs/schedule";
import type {
  OrganizationJobMetrics,
  OrganizationJobOutcome,
  OrganizationJobType,
} from "@/features/background-jobs/types";
import { regenerateDailyBrief } from "@/features/detection/service";
import { deliverScheduledMorningBriefsForOrganization } from "@/features/email/delivery-service";
import { FinancialSnapshotService } from "@/features/financial-analytics/snapshot-service";
import { refreshPortfolioIntelligence } from "@/features/portfolio-intelligence/service";
import { RiskSnapshotService } from "@/features/risk-analytics/snapshot-service";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  syncProcoreConnection,
  syncQueuedProcoreJobs,
} from "@/features/procore/sync";

export async function runPortfolioRefresh(organizationId: string) {
  const [intelligence, financialSnapshot, riskSnapshot] = await Promise.all([
    refreshPortfolioIntelligence(organizationId),
    new FinancialSnapshotService().createMonthlySnapshot(organizationId),
    new RiskSnapshotService().createMonthlySnapshot(organizationId),
  ]);
  return {
    observations: intelligence.observations,
    relationships: intelligence.relationships,
    financialSnapshotCreated: Boolean(financialSnapshot),
    riskSnapshotCreated: Boolean(riskSnapshot),
  } satisfies OrganizationJobMetrics;
}

export async function runDailyExecutiveBrief(
  organizationId: string,
  now = new Date(),
) {
  const briefItemCount = await regenerateDailyBrief(organizationId, now);
  const delivery =
    briefItemCount === 3
      ? await deliverScheduledMorningBriefsForOrganization(
          organizationId,
          now,
          { respectUserSchedule: false },
        )
      : { sent: 0, skipped: 0, failed: 0 };
  if (delivery.failed > 0) {
    throw new Error(`${delivery.failed} Daily Brief deliveries failed.`);
  }
  return {
    briefItemCount,
    deliveriesSent: delivery.sent,
    deliveriesSkipped: delivery.skipped,
    deliveriesFailed: delivery.failed,
  } satisfies OrganizationJobMetrics;
}

export async function runScheduledOrganizationJobs(
  jobType: OrganizationJobType,
  now = new Date(),
) {
  const client = createAdminSupabaseClient();
  const [schedulesResult, retries] = await Promise.all([
    client.from("organization_job_schedules").select("*"),
    listRetryableJobRuns(jobType),
  ]);
  if (schedulesResult.error) throw new Error(schedulesResult.error.message);
  const outcomes: OrganizationJobOutcome[] = [];

  for (const retry of retries) {
    outcomes.push(
      await executeOrganizationJob(
        {
          organizationId: retry.organization_id,
          jobType,
          source: "retry",
          idempotencyKey: retry.idempotency_key,
          maxAttempts: retry.max_attempts,
        },
        () => jobWorker(jobType, retry.organization_id, now),
        now,
      ),
    );
  }

  for (const schedule of schedulesResult.data ?? []) {
    const due = scheduledOrganizationJob({
      organizationId: schedule.organization_id,
      jobType,
      enabled:
        jobType === "portfolio_refresh"
          ? schedule.portfolio_refresh_enabled
          : schedule.daily_brief_enabled,
      localTime:
        jobType === "portfolio_refresh"
          ? schedule.portfolio_refresh_time
          : schedule.daily_brief_time,
      timezone: schedule.timezone,
      now,
    });
    if (!due) continue;
    outcomes.push(
      await executeOrganizationJob(
        {
          organizationId: schedule.organization_id,
          jobType,
          source: "scheduled",
          idempotencyKey: due.idempotencyKey,
          maxAttempts: schedule.max_attempts,
          scheduledFor: due.scheduledFor,
        },
        () => jobWorker(jobType, schedule.organization_id, now),
        now,
      ),
    );
  }
  return summarizeOutcomes(outcomes);
}

export async function runQueuedProcoreSyncJobs() {
  const client = createAdminSupabaseClient();
  const queued = await syncQueuedProcoreJobs();
  const outcomes: OrganizationJobOutcome[] = [];
  for (const job of queued) {
    const connection = await client
      .from("integration_connections")
      .select("id")
      .eq("organization_id", job.organization_id)
      .eq("provider", "procore")
      .neq("status", "disconnected")
      .maybeSingle();
    if (connection.error) throw new Error(connection.error.message);
    if (!connection.data) continue;
    outcomes.push(
      await executeOrganizationJob(
        {
          organizationId: job.organization_id,
          jobType: "procore_sync",
          source: "manual",
          idempotencyKey: job.idempotency_key,
          maxAttempts: job.max_attempts,
        },
        () =>
          syncProcoreConnection(connection.data!.id, job.organization_id).then(
            (metrics) => metrics as OrganizationJobMetrics,
          ),
      ),
    );
  }
  return summarizeOutcomes(outcomes);
}

function jobWorker(
  jobType: OrganizationJobType,
  organizationId: string,
  now: Date,
) {
  return jobType === "portfolio_refresh"
    ? runPortfolioRefresh(organizationId)
    : jobType === "daily_executive_brief"
      ? runDailyExecutiveBrief(organizationId, now)
      : syncProcoreConnectionForOrganization(organizationId);
}

async function syncProcoreConnectionForOrganization(organizationId: string) {
  const connection = await createAdminSupabaseClient()
    .from("integration_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider", "procore")
    .eq("status", "active")
    .maybeSingle();
  if (connection.error) throw new Error(connection.error.message);
  if (!connection.data) return { skipped: true, projectsDiscovered: 0 };
  return syncProcoreConnection(connection.data.id, organizationId);
}

function summarizeOutcomes(outcomes: readonly OrganizationJobOutcome[]) {
  return {
    attempted: outcomes.length,
    succeeded: outcomes.filter((outcome) => outcome.status === "succeeded")
      .length,
    failed: outcomes.filter((outcome) => outcome.status === "failed").length,
    skipped: outcomes.filter((outcome) => outcome.status === "skipped").length,
    outcomes,
  };
}
