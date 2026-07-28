import { NextResponse } from "next/server";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ reportId: string; attachmentId: string }>;
  },
) {
  const { reportId, attachmentId } = await context.params;
  const operator = await requirePlatformPermission(
    "platform.support.read",
    "bug_report_attachment",
    attachmentId,
  );
  const client = createAdminSupabaseClient();
  const { data: attachment, error } = await client
    .from("bug_report_attachments")
    .select("storage_path,organization_id")
    .eq("id", attachmentId)
    .eq("bug_report_id", reportId)
    .maybeSingle();
  if (error || !attachment)
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  const { data, error: signedError } = await client.storage
    .from("bug-report-attachments")
    .createSignedUrl(attachment.storage_path, 60);
  if (signedError || !data.signedUrl)
    return NextResponse.json({ message: "File unavailable." }, { status: 404 });
  await recordPlatformAuditEvent({
    operator,
    action: "platform.bug_report.attachment_viewed",
    resourceType: "bug_report_attachment",
    resourceId: attachmentId,
    organizationId: attachment.organization_id,
  });
  return NextResponse.redirect(data.signedUrl);
}
