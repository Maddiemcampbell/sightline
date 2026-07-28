"use server";

import { revalidatePath } from "next/cache";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { PlatformOperatorService } from "@/features/platform-admin/operator-service";
import {
  createOperatorSchema,
  updateOperatorSchema,
} from "@/features/platform-admin/operator-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function createOperatorAction(formData: FormData) {
  const actor = await requirePlatformPermission(
    "platform.admin.manage",
    "platform_operator",
    "new",
  );
  const input = createOperatorSchema.parse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    mfaRequired: formData.get("mfaRequired") === "on",
    permissions: formData.getAll("permissions"),
  });
  try {
    const id = await new PlatformOperatorService(
      createAdminSupabaseClient(),
    ).create(input, actor);
    await recordPlatformAuditEvent({
      operator: actor,
      action: "platform.operator.created",
      resourceType: "platform_operator",
      resourceId: id,
      metadata: {
        email: input.email,
        permissions: input.permissions,
        mfaRequired: input.mfaRequired,
      },
    });
  } catch (error) {
    await recordPlatformAuditEvent({
      operator: actor,
      action: "platform.operator.created",
      resourceType: "platform_operator",
      outcome: "failed",
      metadata: { email: input.email },
    });
    throw error;
  }
  revalidatePath("/internal/admin/operators");
}

export async function updateOperatorAction(formData: FormData) {
  const id = formData.get("id")?.toString() ?? "";
  const actor = await requirePlatformPermission(
    "platform.admin.manage",
    "platform_operator",
    id,
  );
  const input = updateOperatorSchema.parse({
    id,
    displayName: formData.get("displayName"),
    status: formData.get("status"),
    mfaRequired: formData.get("mfaRequired") === "on",
    permissions: formData.getAll("permissions"),
  });
  try {
    await new PlatformOperatorService(createAdminSupabaseClient()).update(
      input,
      actor,
    );
    await recordPlatformAuditEvent({
      operator: actor,
      action: "platform.operator.updated",
      resourceType: "platform_operator",
      resourceId: input.id,
      metadata: {
        status: input.status,
        permissions: input.permissions,
        mfaRequired: input.mfaRequired,
      },
    });
  } catch (error) {
    await recordPlatformAuditEvent({
      operator: actor,
      action: "platform.operator.updated",
      resourceType: "platform_operator",
      resourceId: input.id,
      outcome: "failed",
    });
    throw error;
  }
  revalidatePath("/internal/admin/operators");
}
