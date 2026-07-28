"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { schedulerRegistry } from "@/features/scheduler/jobs";
import { SchedulerService } from "@/features/scheduler/service";

const manualJobSchema = z.enum([
  "risk-detection",
  "portfolio-refresh",
  "daily-brief",
  "privacy-cleanup",
  "customer-data-exports",
]);

export async function triggerSchedulerJobAction(formData: FormData) {
  const jobKey = manualJobSchema.parse(formData.get("jobKey"));
  const operator = await requirePlatformPermission(
    "platform.jobs.read",
    "scheduler_job",
    jobKey,
  );
  schedulerRegistry.get(jobKey);
  try {
    const execution = await new SchedulerService().trigger({
      jobKey,
      trigger: "manual",
      initiatingOperatorId: operator.id,
    });
    await recordPlatformAuditEvent({
      operator,
      action: "platform.scheduler_job.triggered",
      resourceType: "scheduler_job",
      resourceId: jobKey,
      outcome:
        execution.status === "failed" || execution.status === "timed_out"
          ? "failed"
          : "success",
      metadata: {
        executionId: execution.id,
        correlationId: execution.correlationId,
        status: execution.status,
      },
    });
  } catch (error) {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.scheduler_job.triggered",
      resourceType: "scheduler_job",
      resourceId: jobKey,
      outcome: "failed",
      metadata: { reason: "execution_setup_failed" },
    });
    throw error;
  }
  revalidatePath("/internal/admin/jobs");
}
