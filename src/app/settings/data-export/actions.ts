"use server";

import { revalidatePath } from "next/cache";
import { DataExportService } from "@/features/data-exports/service";
import { recordAuditEvent } from "@/features/audit/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type DataExportActionState = { message: string; error?: string };

export async function requestDataExportAction(
  _state: DataExportActionState,
  formData: FormData,
): Promise<DataExportActionState> {
  try {
    const context = await requireActorContext();
    const job = await new DataExportService(
      createAdminSupabaseClient(),
    ).request(context, { format: formData.get("format") });
    await recordAuditEvent({
      organizationId: context.organizationId,
      actorAuthUserId: context.authUserId,
      actorUserId: context.userId,
      action: "data_export.requested",
      resourceType: "organization_data_export",
      resourceId: job.id,
      metadata: { format: job.export_format },
    });
    revalidatePath("/settings/data-export");
    return {
      message: "Export requested. Sightline will notify you when it is ready.",
    };
  } catch (error) {
    return {
      message: "",
      error:
        error instanceof Error
          ? error.message
          : "The export could not be requested.",
    };
  }
}

