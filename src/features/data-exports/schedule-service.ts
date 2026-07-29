import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AuditService, auditRequestContext } from "@/features/audit/core";
import { AuditLogRepository } from "@/features/audit/repository";
import { DataExportScheduleRepository } from "@/features/data-exports/schedule-repository";
import { scheduledDataExportOccurrence } from "@/features/data-exports/schedule";
import { dataExportScheduleSchema } from "@/features/data-exports/schedule-validation";
import {
  assertAuthorized,
  canExportOrganizationData,
  type ActorContext,
} from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class DataExportScheduleService {
  private readonly repository: DataExportScheduleRepository;

  constructor(private readonly client: SupabaseClient<AppDatabase>) {
    this.repository = new DataExportScheduleRepository(client);
  }

  async save(context: ActorContext, input: unknown) {
    assertAuthorized(canExportOrganizationData(context));
    const values = dataExportScheduleSchema.parse(input);
    const [
      { data: membership, error: membershipError },
      { data: user, error: userError },
    ] = await Promise.all([
      this.client
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("auth_user_id", context.authUserId)
        .single(),
      this.client
        .from("users")
        .select("full_name,email")
        .eq("organization_id", context.organizationId)
        .eq("id", context.userId)
        .single(),
    ]);
    if (membershipError) throw new Error(membershipError.message);
    if (userError) throw new Error(userError.message);
    return this.repository.save({
      organization_id: context.organizationId,
      enabled: values.enabled,
      export_format: values.exportFormat,
      cadence: values.cadence,
      local_time: values.localTime,
      weekday: values.weekday,
      day_of_month: values.dayOfMonth,
      timezone: values.timezone,
      configured_by_membership_id: membership.id,
      configured_by_auth_user_id: context.authUserId,
      configured_by_name: user.full_name,
      configured_by_email: user.email,
    });
  }
}

export async function enqueueDueScheduledDataExports(
  client: SupabaseClient<AppDatabase>,
  now = new Date(),
) {
  const schedules = await new DataExportScheduleRepository(client).enabled();
  const queued: string[] = [];
  for (const schedule of schedules) {
    const occurrence = scheduledDataExportOccurrence(
      {
        id: schedule.id,
        organizationId: schedule.organization_id,
        enabled: schedule.enabled,
        cadence: schedule.cadence,
        localTime: schedule.local_time,
        weekday: schedule.weekday,
        dayOfMonth: schedule.day_of_month,
        timezone: schedule.timezone,
      },
      now,
    );
    if (!occurrence) continue;
    const { data, error } = await client
      .from("organization_data_exports")
      .upsert(
        {
          organization_id: schedule.organization_id,
          requested_by_membership_id: schedule.configured_by_membership_id,
          requested_by_auth_user_id: schedule.configured_by_auth_user_id,
          requested_by_name: schedule.configured_by_name,
          requested_by_email: schedule.configured_by_email,
          export_format: schedule.export_format,
          schedule_id: schedule.id,
          schedule_occurrence_key: occurrence.occurrenceKey,
        },
        {
          onConflict: "schedule_id,schedule_occurrence_key",
          ignoreDuplicates: true,
        },
      )
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) continue;
    queued.push(data.id);
    await new AuditService(new AuditLogRepository(client)).record(
      {
        organizationId: schedule.organization_id,
        actorAuthUserId: schedule.configured_by_auth_user_id,
        actorUserId: null,
        action: "data_export.scheduled",
        resourceType: "organization_data_export",
        resourceId: data.id,
        metadata: {
          scheduleId: schedule.id,
          occurrenceKey: occurrence.occurrenceKey,
          format: schedule.export_format,
        },
      },
      auditRequestContext(new Headers()),
    );
  }
  return queued;
}
