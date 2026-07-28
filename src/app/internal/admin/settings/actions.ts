"use server";

import { revalidatePath } from "next/cache";

import { FeatureFlagRepository } from "@/features/feature-flags/repository";
import { featureFlagMutationSchema } from "@/features/feature-flags/validation";
import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function inputFromForm(formData: FormData) {
  return featureFlagMutationSchema.parse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description"),
    enabled: formData.get("enabled") === "on",
    defaultEnabled: formData.get("defaultEnabled") === "on",
    environments: formData.get("environments") ?? "",
    organizationIds: formData.get("organizationIds") ?? "",
    userIds: formData.get("userIds") ?? "",
    rolloutPercentage: formData.get("rolloutPercentage"),
  });
}

export async function createFeatureFlagAction(formData: FormData) {
  const operator = await requirePlatformPermission(
    "platform.flags.manage",
    "feature_flag",
    "new",
  );
  const input = inputFromForm(formData);
  try {
    const flag = await new FeatureFlagRepository(
      createAdminSupabaseClient(),
    ).create(input, operator.id);
    await recordPlatformAuditEvent({
      operator,
      action: "platform.feature_flag.created",
      resourceType: "feature_flag",
      resourceId: flag.id,
      metadata: { flagKey: flag.key, enabled: flag.enabled },
    });
  } catch (error) {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.feature_flag.created",
      resourceType: "feature_flag",
      outcome: "failed",
      metadata: { flagKey: input.key },
    });
    throw error;
  }
  revalidatePath("/internal/admin/settings");
}

export async function updateFeatureFlagAction(formData: FormData) {
  const id = formData.get("id")?.toString() ?? "";
  const operator = await requirePlatformPermission(
    "platform.flags.manage",
    "feature_flag",
    id,
  );
  const input = inputFromForm(formData);
  try {
    const flag = await new FeatureFlagRepository(
      createAdminSupabaseClient(),
    ).update(id, input, operator.id);
    await recordPlatformAuditEvent({
      operator,
      action: "platform.feature_flag.updated",
      resourceType: "feature_flag",
      resourceId: flag.id,
      metadata: { flagKey: flag.key, enabled: flag.enabled },
    });
  } catch (error) {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.feature_flag.updated",
      resourceType: "feature_flag",
      resourceId: id,
      outcome: "failed",
      metadata: { flagKey: input.key },
    });
    throw error;
  }
  revalidatePath("/internal/admin/settings");
}
