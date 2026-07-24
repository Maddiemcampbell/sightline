"use server";

import { revalidatePath } from "next/cache";
import { recordAuditEvent } from "@/features/audit/service";
import { PrivacyService } from "@/features/privacy/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type PrivacyActionState = { message: string; error?: string };

function service() {
  return new PrivacyService(createAdminSupabaseClient());
}

export async function updatePrivacySettingsAction(
  _state: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  try {
    const context = await requireActorContext();
    await service().updateSettings(context, {
      softDeleteGraceDays: Number(formData.get("softDeleteGraceDays")),
      documentRetentionDays: Number(formData.get("documentRetentionDays")),
      activityRetentionDays: Number(formData.get("activityRetentionDays")),
      aiRetentionDays: Number(formData.get("aiRetentionDays")),
      auditRetentionDays: Number(formData.get("auditRetentionDays")),
      deletedRecordRetentionDays: Number(formData.get("deletedRecordRetentionDays")),
    });
    await audit(context, "privacy.retention_updated", "retention_policy");
    revalidatePath("/settings/privacy");
    return { message: "Data retention settings saved." };
  } catch (error) {
    return privacyError(error);
  }
}

export async function requestOrganizationDeletionAction(
  _state: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  try {
    const context = await requireActorContext();
    const client = createAdminSupabaseClient();
    const { data, error } = await client
      .from("organizations")
      .select("name")
      .eq("id", context.organizationId)
      .single();
    if (error) throw new Error(error.message);
    const request = await service().requestOrganizationDeletion(
      context,
      data.name,
      {
        scope: formData.get("scope"),
        confirmation: formData.get("confirmation"),
      },
    );
    await audit(
      context,
      "privacy.deletion_requested",
      "organization",
      request.id,
      { scope: request.scope, scheduledFor: request.scheduled_for },
    );
    revalidatePath("/settings/privacy");
    return {
      message: `Deletion scheduled for ${new Date(request.scheduled_for).toLocaleString()}.`,
    };
  } catch (error) {
    return privacyError(error);
  }
}

export async function requestAccountDeletionAction(
  _state: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  try {
    const context = await requireActorContext();
    const request = await service().requestUserDeletion(context, {
      confirmation: formData.get("confirmation"),
    });
    await audit(
      context,
      "privacy.deletion_requested",
      "user_account",
      request.id,
      { scope: "user_only", scheduledFor: request.scheduled_for },
    );
    revalidatePath("/settings/privacy");
    return {
      message: `Account deletion scheduled for ${new Date(request.scheduled_for).toLocaleString()}.`,
    };
  } catch (error) {
    return privacyError(error);
  }
}

export async function cancelDeletionAction(formData: FormData) {
  const context = await requireActorContext();
  const request = await service().cancel(context, {
    requestId: formData.get("requestId"),
  });
  await audit(
    context,
    "privacy.deletion_cancelled",
    "privacy_deletion_request",
    request.id,
    { scope: request.scope },
  );
  revalidatePath("/settings/privacy");
}

async function audit(
  context: Awaited<ReturnType<typeof requireActorContext>>,
  action:
    | "privacy.deletion_requested"
    | "privacy.deletion_cancelled"
    | "privacy.retention_updated",
  resourceType: string,
  resourceId?: string,
  metadata: Record<string, string> = {},
) {
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action,
    resourceType,
    ...(resourceId ? { resourceId } : {}),
    metadata,
  });
}

function privacyError(error: unknown): PrivacyActionState {
  return {
    message: "",
    error: error instanceof Error ? error.message : "Privacy settings could not be updated.",
  };
}
