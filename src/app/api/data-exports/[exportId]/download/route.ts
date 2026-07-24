import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/features/audit/service";
import { DataExportRepository } from "@/features/data-exports/repository";
import { isExportDownloadAllowed } from "@/features/data-exports/download-security";
import { EXPORT_BUCKET } from "@/features/data-exports/worker";
import { dataExportIdSchema } from "@/features/data-exports/validation";
import { canExportOrganizationData } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 300;
type Context = { params: Promise<{ exportId: string }> };

function unavailable() {
  return NextResponse.json(
    { error: "Export not found." },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(_request: Request, { params }: Context) {
  const context = await requireActorContext();
  if (!canExportOrganizationData(context)) return unavailable();
  const id = dataExportIdSchema.safeParse((await params).exportId);
  if (!id.success) return unavailable();
  const client = createAdminSupabaseClient();
  const job = await new DataExportRepository(client).get(
    context.organizationId,
    id.data,
  );
  if (!isExportDownloadAllowed(context, job, Date.now())) return unavailable();
  const { data, error } = await client.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(job.storage_path!, SIGNED_URL_TTL_SECONDS, {
      download: job.artifact_name ?? "sightline-export",
    });
  if (error || !data?.signedUrl) return unavailable();
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "data_export.downloaded",
    resourceType: "organization_data_export",
    resourceId: job.id,
    metadata: { format: job.export_format },
  });
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
