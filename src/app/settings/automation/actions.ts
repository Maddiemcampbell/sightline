"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  runDailyExecutiveBrief,
  runPortfolioRefresh,
} from "@/features/background-jobs/runners";
import { executeOrganizationJob } from "@/features/background-jobs/service";
import { recordAuditEvent } from "@/features/audit/service";
import type { AuditAction } from "@/features/audit/core";
import {
  assertAuthorized,
  canManageOrganization,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type AutomationActionState = { message: string; error?: string };

const scheduleSchema = z.object({
  portfolioEnabled: z.boolean(),
  portfolioTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  briefEnabled: z.boolean(),
  briefTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  maxAttempts: z.coerce.number().int().min(1).max(10),
});

export async function updateAutomationScheduleAction(
  _state: AutomationActionState,
  formData: FormData,
): Promise<AutomationActionState> {
  const parsed = scheduleSchema.safeParse({
    portfolioEnabled: formData.get("portfolioEnabled") === "on",
    portfolioTime: formData.get("portfolioTime"),
    briefEnabled: formData.get("briefEnabled") === "on",
    briefTime: formData.get("briefTime"),
    maxAttempts: formData.get("maxAttempts"),
  });
  if (!parsed.success) {
    return {
      message: "",
      error: parsed.error.issues[0]?.message ?? "Check the schedule.",
    };
  }
  const context = await requireActorContext();
  assertAuthorized(canManageOrganization(context));
  const { data: organization, error: organizationError } =
    await createAdminSupabaseClient()
      .from("organizations")
      .select("timezone")
      .eq("id", context.organizationId)
      .single();
  if (organizationError)
    return { message: "", error: organizationError.message };
  const { error } = await createAdminSupabaseClient()
    .from("organization_job_schedules")
    .upsert({
      organization_id: context.organizationId,
      timezone: organization.timezone,
      portfolio_refresh_enabled: parsed.data.portfolioEnabled,
      portfolio_refresh_time: parsed.data.portfolioTime,
      daily_brief_enabled: parsed.data.briefEnabled,
      daily_brief_time: parsed.data.briefTime,
      max_attempts: parsed.data.maxAttempts,
    });
  if (error) return { message: "", error: error.message };
  await audit(context, "automation.schedule_updated", {
    portfolioEnabled: parsed.data.portfolioEnabled,
    briefEnabled: parsed.data.briefEnabled,
  });
  revalidatePath("/settings/automation");
  return { message: "Automation schedule saved." };
}

export async function refreshPortfolioNowAction(
  _state: AutomationActionState,
): Promise<AutomationActionState> {
  void _state;
  return runManualJob("portfolio_refresh");
}

export async function generateDailyBriefNowAction(
  _state: AutomationActionState,
): Promise<AutomationActionState> {
  void _state;
  return runManualJob("daily_executive_brief");
}

async function runManualJob(
  jobType: "portfolio_refresh" | "daily_executive_brief",
): Promise<AutomationActionState> {
  const context = await requireActorContext();
  assertAuthorized(canManageOrganization(context));
  const outcome = await executeOrganizationJob(
    {
      organizationId: context.organizationId,
      jobType,
      source: "manual",
      idempotencyKey: `manual/${crypto.randomUUID()}`,
      requestedByMembershipId: await membershipId(context),
    },
    () =>
      jobType === "portfolio_refresh"
        ? runPortfolioRefresh(context.organizationId)
        : runDailyExecutiveBrief(context.organizationId),
  );
  await audit(context, "automation.manual_run", {
    jobType,
    runId: outcome.id,
    status: outcome.status,
  });
  revalidatePath("/settings/automation");
  revalidatePath("/");
  if (outcome.status === "failed") {
    return {
      message: "",
      error: `${jobType === "portfolio_refresh" ? "Portfolio refresh" : "Daily Executive Brief"} failed. Sightline will retry automatically.`,
    };
  }
  return {
    message:
      jobType === "portfolio_refresh"
        ? "Portfolio Intelligence refreshed."
        : "Daily Executive Brief generated and delivered.",
  };
}

async function membershipId(
  context: Awaited<ReturnType<typeof requireActorContext>>,
) {
  const { data, error } = await createAdminSupabaseClient()
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("auth_user_id", context.authUserId)
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function audit(
  context: Awaited<ReturnType<typeof requireActorContext>>,
  action: AuditAction,
  metadata: Record<string, string | boolean>,
) {
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action,
    resourceType: "organization_automation",
    resourceId: context.organizationId,
    metadata,
  });
}
