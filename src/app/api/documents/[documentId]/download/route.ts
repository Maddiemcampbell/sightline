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
    .select("id,organization_id,storage_path,archived_at")
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

  const { data, error: signedUrlError } = await createAdminSupabaseClient()
    .storage.from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, DOCUMENT_SIGNED_URL_TTL_SECONDS, {
      download: true,
    });
  // Missing objects and signing failures intentionally look the same as
  // missing, archived, and cross-tenant document records.
  if (signedUrlError || !data?.signedUrl) return fileNotFound();

  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
