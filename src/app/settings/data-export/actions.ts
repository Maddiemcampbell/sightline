"use server";

import { revalidatePath } from "next/cache";
import { DataExportService } from "@/features/data-exports/service";
import { DataExportScheduleService } from "@/features/data-exports/schedule-service";
import { recordAuditEvent } from "@/features/audit/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type DataExportActionState = { message: string; error?: string };

export type DataExportScheduleActionState = {
  message: string;
  error?: string;
};

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

export async function saveDataExportScheduleAction(
  _state: DataExportScheduleActionState,
  formData: FormData,
): Promise<DataExportScheduleActionState> {
  try {
    const context = await requireActorContext();
    const schedule = await new DataExportScheduleService(
      createAdminSupabaseClient(),
    ).save(context, {
      enabled: formData.get("enabled") === "on",
      exportFormat: formData.get("exportFormat"),
      cadence: formData.get("cadence"),
      localTime: formData.get("localTime"),
      weekday: formData.get("weekday"),
      dayOfMonth: formData.get("dayOfMonth"),
      timezone: formData.get("timezone"),
    });
    await recordAuditEvent({
      organizationId: context.organizationId,
      actorAuthUserId: context.authUserId,
      actorUserId: context.userId,
      action: "data_export.schedule_updated",
      resourceType: "organization_data_export_schedule",
      resourceId: schedule.id,
      metadata: {
        enabled: schedule.enabled,
        cadence: schedule.cadence,
        format: schedule.export_format,
      },
    });
    revalidatePath("/settings/data-export");
    return { message: "Recurring export schedule saved." };
  } catch (error) {
    return {
      message: "",
      error:
        error instanceof Error
          ? error.message
          : "The recurring export schedule could not be saved.",
    };
  }
}
