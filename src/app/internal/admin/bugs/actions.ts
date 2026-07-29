"use server";

import { revalidatePath } from "next/cache";

import { BugReportAdminRepository } from "@/features/bug-reports/admin-repository";
import {
  bugReportAdminUpdateSchema,
  bugReportNoteSchema,
} from "@/features/bug-reports/validation";
import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function updateBugReportAction(formData: FormData) {
  const input = bugReportAdminUpdateSchema.parse({
    reportId: formData.get("reportId"),
    status: formData.get("status"),
    assignedOperatorId: formData.get("assignedOperatorId") || null,
    resolutionNotes: formData.get("resolutionNotes") || undefined,
    relatedReleaseId: formData.get("relatedReleaseId") || null,
    externalIssueReference: formData.get("externalIssueReference") || undefined,
  });
  const operator = await requirePlatformPermission(
    "platform.support.write",
    "bug_report",
    input.reportId,
  );
  await new BugReportAdminRepository(createAdminSupabaseClient()).update(
    input.reportId,
    input,
  );
  await recordPlatformAuditEvent({
    operator,
    action: "platform.bug_report.updated",
    resourceType: "bug_report",
    resourceId: input.reportId,
    metadata: { status: input.status },
  });
  revalidatePath(`/internal/admin/bugs/${input.reportId}`);
  revalidatePath("/internal/admin/bugs");
}

export async function addBugReportNoteAction(formData: FormData) {
  const input = bugReportNoteSchema.parse({
    reportId: formData.get("reportId"),
    body: formData.get("body"),
  });
  const operator = await requirePlatformPermission(
    "platform.support.write",
    "bug_report",
    input.reportId,
  );
  await new BugReportAdminRepository(createAdminSupabaseClient()).addNote(
    input.reportId,
    operator.id,
    input.body,
  );
  await recordPlatformAuditEvent({
    operator,
    action: "platform.bug_report.note_added",
    resourceType: "bug_report",
    resourceId: input.reportId,
  });
  revalidatePath(`/internal/admin/bugs/${input.reportId}`);
}
