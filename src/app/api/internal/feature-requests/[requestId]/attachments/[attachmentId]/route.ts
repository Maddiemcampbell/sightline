import { NextResponse } from "next/server";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string; attachmentId: string }> },
) {
  const { requestId, attachmentId } = await params;
  const operator = await requirePlatformPermission(
    "platform.support.read",
    "feature_request_attachment",
    attachmentId,
  );
  const client = createAdminSupabaseClient();
  const { data: attachment, error } = await client
    .from("feature_request_attachments")
    .select("*")
    .eq("id", attachmentId)
    .eq("feature_request_id", requestId)
    .maybeSingle();
  if (error || !attachment)
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  const { data, error: downloadError } = await client.storage
    .from("feature-request-attachments")
    .download(attachment.storage_path);
  if (downloadError || !data)
    return NextResponse.json({ message: "File unavailable." }, { status: 404 });
  await recordPlatformAuditEvent({
    operator,
    action: "platform.feature_request.attachment_viewed",
    resourceType: "feature_request_attachment",
    resourceId: attachmentId,
  });
  return new Response(data, {
    headers: {
      "Content-Type": attachment.mime_type,
      "Content-Disposition": `inline; filename="${attachment.original_filename.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
