"use server";

import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/features/audit/service";
import { ExceptionAlertService } from "@/features/exception-alerts/service";
import { exceptionRuleSettingsSchema } from "@/features/exception-alerts/validation";
import {
  assertAuthorized,
  canManageOrganization,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type ExceptionSettingsActionState = { message: string; error?: string };

export async function updateExceptionRulesAction(
  _state: ExceptionSettingsActionState,
  formData: FormData,
): Promise<ExceptionSettingsActionState> {
  const parsed = exceptionRuleSettingsSchema.safeParse({
    marginEnabled: formData.get("marginEnabled") === "on",
    marginFloorPercent: formData.get("marginFloorPercent"),
    budgetEnabled: formData.get("budgetEnabled") === "on",
    budgetVariancePercent: formData.get("budgetVariancePercent"),
    unownedRiskEnabled: formData.get("unownedRiskEnabled") === "on",
    actionDueEnabled: formData.get("actionDueEnabled") === "on",
    actionDueDays: formData.get("actionDueDays"),
    documentExpiryEnabled: formData.get("documentExpiryEnabled") === "on",
    documentExpiryDays: formData.get("documentExpiryDays"),
    syncStaleEnabled: formData.get("syncStaleEnabled") === "on",
    syncStaleHours: formData.get("syncStaleHours"),
    forecastStaleEnabled: formData.get("forecastStaleEnabled") === "on",
    forecastStaleDays: formData.get("forecastStaleDays"),
  });
  if (!parsed.success)
    return {
      message: "",
      error: parsed.error.issues[0]?.message ?? "Check the thresholds.",
    };
  const context = await requireActorContext();
  assertAuthorized(canManageOrganization(context));
  const value = parsed.data;
  const { error } = await createAdminSupabaseClient()
    .from("exception_alert_rules")
    .upsert({
      organization_id: context.organizationId,
      margin_enabled: value.marginEnabled,
      margin_floor_percent: value.marginFloorPercent,
      budget_enabled: value.budgetEnabled,
      budget_variance_percent: value.budgetVariancePercent,
      unowned_risk_enabled: value.unownedRiskEnabled,
      action_due_enabled: value.actionDueEnabled,
      action_due_days: value.actionDueDays,
      document_expiry_enabled: value.documentExpiryEnabled,
      document_expiry_days: value.documentExpiryDays,
      sync_stale_enabled: value.syncStaleEnabled,
      sync_stale_hours: value.syncStaleHours,
      forecast_stale_enabled: value.forecastStaleEnabled,
      forecast_stale_days: value.forecastStaleDays,
    });
  if (error) return { message: "", error: error.message };
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "settings.updated",
    resourceType: "exception_alert_rules",
    resourceId: context.organizationId,
    metadata: { source: "notification_settings" },
  });
  revalidatePath("/settings/notifications");
  return { message: "Exception thresholds saved." };
}

export async function runExceptionCheckAction() {
  const context = await requireActorContext();
  assertAuthorized(canManageOrganization(context));
  await new ExceptionAlertService(
    createAdminSupabaseClient(),
  ).evaluateOrganization(context.organizationId);
  revalidatePath("/settings/notifications");
  revalidatePath("/", "layout");
}
