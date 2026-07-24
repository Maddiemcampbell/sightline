import { NextResponse } from "next/server";
import {
  DOCUMENT_SIGNED_URL_TTL_SECONDS,
  isDocumentDownloadAllowed,
} from "@/features/documents/download-security";
import {
  DOCUMENT_BUCKET,
  documentIdSchema,
} from "@/features/documents/validation";
import { requireActorContext } from "@/lib/auth/request-context";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { recordAuditEvent } from "@/features/audit/service";
import { canViewProjectDocuments } from "@/lib/auth/authorization";
import { requireProjectAccess } from "@/lib/auth/project-access";

type Context = { params: Promise<{ documentId: string }> };

function fileNotFound() {
  return NextResponse.json(
    { error: "File not found." },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

export async function GET(_request: Request, { params }: Context) {
  const context = await requireActorContext();
  const parsedId = documentIdSchema.safeParse((await params).documentId);
  if (!parsedId.success) return fileNotFound();

  const client = await createServerSupabaseClient();
  const { data: document, error } = await client
    .from("documents")
    .select("id,organization_id,project_id,storage_path,archived_at")
    .eq("organization_id", context.organizationId)
    .eq("id", parsedId.data)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "File unavailable." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (!isDocumentDownloadAllowed(context, document)) return fileNotFound();
  if (document.project_id) {
    const access = await requireProjectAccess(context, document.project_id);
    if (!canViewProjectDocuments(context, access.resource))
      return fileNotFound();
  } else if (
    context.organizationRole !== "owner" &&
    context.organizationRole !== "administrator"
  ) {
    return fileNotFound();
  }

  const { data, error: signedUrlError } = await createAdminSupabaseClient()
    .storage.from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, DOCUMENT_SIGNED_URL_TTL_SECONDS, {
      download: true,
    });
  // Missing objects and signing failures intentionally look the same as
  // missing, archived, and cross-tenant document records.
  if (signedUrlError || !data?.signedUrl) return fileNotFound();
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "document.downloaded",
    resourceType: "document",
    resourceId: document.id,
    metadata: {},
  });

  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
