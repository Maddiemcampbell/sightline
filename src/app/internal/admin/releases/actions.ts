"use server";

import { revalidatePath } from "next/cache";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { ReleaseRepository } from "@/features/releases/repository";
import { ReleaseTrackingService } from "@/features/releases/service";
import {
  createReleaseSchema,
  updateReleaseSchema,
} from "@/features/releases/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function createReleaseAction(formData: FormData) {
  const operator = await requirePlatformPermission(
    "platform.releases.read",
    "release",
    "new",
  );
  const rawDeployedAt = formData.get("deployedAt")?.toString() ?? "";
  const input = createReleaseSchema.parse({
    identifier: formData.get("identifier"),
    applicationVersion: formData.get("applicationVersion"),
    environment: formData.get("environment"),
    status: formData.get("status"),
    deployedAt: rawDeployedAt ? new Date(rawDeployedAt).toISOString() : null,
    commitSha: formData.get("commitSha") || "",
    sourceReference: formData.get("sourceReference") || "",
    deployedBy: formData.get("deployedBy") || "",
    releaseNotes: formData.get("releaseNotes") || "",
    featureFlagIds: formData.getAll("featureFlagIds"),
  });
  const service = new ReleaseTrackingService(
    new ReleaseRepository(createAdminSupabaseClient()),
  );
  try {
    const release = await service.create(input, operator.id);
    await recordPlatformAuditEvent({
      operator,
      action: "platform.release.created",
      resourceType: "release",
      resourceId: release.id,
      metadata: {
        releaseIdentifier: release.identifier,
        environment: release.environment,
        status: release.status,
      },
    });
  } catch (error) {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.release.created",
      resourceType: "release",
      outcome: "failed",
      metadata: { releaseIdentifier: input.identifier },
    });
    throw error;
  }
  revalidatePath("/internal/admin/releases");
}

export async function updateReleaseAction(formData: FormData) {
  const id = formData.get("id")?.toString() ?? "";
  const operator = await requirePlatformPermission(
    "platform.releases.read",
    "release",
    id,
  );
  const input = updateReleaseSchema.parse({
    status: formData.get("status"),
    releaseNotes: formData.get("releaseNotes") || "",
    rollbackStatus: formData.get("rollbackStatus"),
  });
  try {
    const release = await new ReleaseTrackingService(
      new ReleaseRepository(createAdminSupabaseClient()),
    ).update(id, input, operator.id);
    await recordPlatformAuditEvent({
      operator,
      action:
        release.status === "rolled_back"
          ? "platform.release.rolled_back"
          : "platform.release.updated",
      resourceType: "release",
      resourceId: release.id,
      metadata: { status: release.status },
    });
  } catch (error) {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.release.updated",
      resourceType: "release",
      resourceId: id,
      outcome: "failed",
      metadata: { status: input.status },
    });
    throw error;
  }
  revalidatePath("/internal/admin/releases");
  revalidatePath(`/internal/admin/releases/${id}`);
}
