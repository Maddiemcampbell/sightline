"use server";

import { revalidatePath } from "next/cache";

import { FeatureRequestAdminRepository } from "@/features/feature-requests/repository";
import {
  featureRequestAdminUpdateSchema,
  featureRequestNoteSchema,
} from "@/features/feature-requests/validation";
import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function updateFeatureRequestAction(formData: FormData) {
  const input = featureRequestAdminUpdateSchema.parse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    assignedOperatorId: formData.get("assignedOperatorId") || null,
    resolutionNotes: formData.get("resolutionNotes") || undefined,
    relatedReleaseId: formData.get("relatedReleaseId") || null,
    externalIssueReference: formData.get("externalIssueReference") || undefined,
  });
  const operator = await requirePlatformPermission(
    "platform.support.write",
    "feature_request",
    input.requestId,
  );
  await new FeatureRequestAdminRepository(createAdminSupabaseClient()).update(
    input.requestId,
    input,
  );
  await recordPlatformAuditEvent({
    operator,
    action: "platform.feature_request.updated",
    resourceType: "feature_request",
    resourceId: input.requestId,
    metadata: { status: input.status },
  });
  revalidatePath(`/internal/admin/feature-requests/${input.requestId}`);
  revalidatePath("/internal/admin/feature-requests");
}

export async function addFeatureRequestNoteAction(formData: FormData) {
  const input = featureRequestNoteSchema.parse({
    requestId: formData.get("requestId"),
    body: formData.get("body"),
  });
  const operator = await requirePlatformPermission(
    "platform.support.write",
    "feature_request",
    input.requestId,
  );
  await new FeatureRequestAdminRepository(createAdminSupabaseClient()).addNote(
    input.requestId,
    operator.id,
    input.body,
  );
  await recordPlatformAuditEvent({
    operator,
    action: "platform.feature_request.note_added",
    resourceType: "feature_request",
    resourceId: input.requestId,
  });
  revalidatePath(`/internal/admin/feature-requests/${input.requestId}`);
}
