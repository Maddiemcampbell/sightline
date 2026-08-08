import "server-only";

import {
  runQueuedProcoreSyncJobs,
  runScheduledOrganizationJobs,
} from "@/features/background-jobs/runners";
import { DataExportWorker } from "@/features/data-exports/worker";
import { enqueueDueScheduledDataExports } from "@/features/data-exports/schedule-service";
import { detectLongRunningJobs } from "@/features/job-monitoring/alerts";
import { runDetection } from "@/features/detection/service";
import { PrivacyCleanupService } from "@/features/privacy/cleanup";
import type { SchedulerHandler } from "@/features/scheduler/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  runOrganizationJobsSequentially,
  uniqueOrganizationJobTargets,
} from "@/lib/tenancy/organization-jobs";

export const riskDetectionHandler: SchedulerHandler = async () => {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("organization_memberships")
    .select("organization_id,application_user_id")
    .order("created_at");
  if (error) throw new Error(error.message);
  const results = await runOrganizationJobsSequentially(
    uniqueOrganizationJobTargets(data ?? []),
    (target) =>
      runDetection({
        organizationId: target.organizationId,
        actorUserId: target.actorUserId,
        source: "scheduled",
      }),
  );
  return {
    organizationsAttempted: results.length,
    risksCreated: results.reduce((total, result) => total + result.created, 0),
    risksUpdated: results.reduce((total, result) => total + result.updated, 0),
  };
};

export const portfolioRefreshHandler: SchedulerHandler = async () => {
  await detectLongRunningJobs();
  const summary = await runScheduledOrganizationJobs("portfolio_refresh");
  return {
    attempted: summary.attempted,
    succeeded: summary.succeeded,
    failed: summary.failed,
    skipped: summary.skipped,
  };
};

export const dailyBriefHandler: SchedulerHandler = async () => {
  const summary = await runScheduledOrganizationJobs("daily_executive_brief");
  return {
    attempted: summary.attempted,
    succeeded: summary.succeeded,
    failed: summary.failed,
    skipped: summary.skipped,
  };
};

export const privacyCleanupHandler: SchedulerHandler = async () => {
  const summary = await new PrivacyCleanupService(
    createAdminSupabaseClient(),
  ).run();
  return {
    organizationsProcessed: summary.retention.length,
    requestsProcessed: summary.requests.length,
    failed: summary.requests.filter((request) => request.status === "failed")
      .length,
  };
};

export const customerDataExportsHandler: SchedulerHandler = async () => {
  const client = createAdminSupabaseClient();
  const queued = await enqueueDueScheduledDataExports(client);
  const summary = await new DataExportWorker(client).run();
  return {
    scheduled: queued.length,
    expired: summary.expired,
    processed: summary.exports.length,
    completed: summary.exports.filter((item) => item.status === "ready").length,
    failed: summary.exports.filter((item) => item.status === "failed").length,
    retrying: summary.exports.filter((item) => item.status === "retrying")
      .length,
  };
};

export const procoreSyncHandler: SchedulerHandler = async () => {
  const summary = await runQueuedProcoreSyncJobs();
  return {
    attempted: summary.attempted,
    succeeded: summary.succeeded,
    failed: summary.failed,
    skipped: summary.skipped,
  };
};
