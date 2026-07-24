import { NextResponse } from "next/server";

import { assertOrganizationAccess } from "@/features/documents/authorization";
import { DOCUMENT_BUCKET } from "@/features/documents/validation";
import { assertOrganizationStoragePath } from "@/features/documents/storage-isolation";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ documentId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const context = await requireActorContext();
  const { documentId } = await params;
  const client = await createServerSupabaseClient();
  const { data: document, error } = await client
    .from("documents")
    .select("organization_id,storage_path,archived_at")
    .eq("organization_id", context.organizationId)
    .eq("id", documentId)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: "File unavailable." }, { status: 500 });
  try {
    assertOrganizationAccess(document, context.organizationId);
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (!document.storage_path || document.archived_at) {
    return NextResponse.json({ error: "File not available." }, { status: 404 });
  }
  try {
    assertOrganizationStoragePath(
      context.organizationId,
      document.storage_path,
    );
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const { data, error: signedUrlError } = await client.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, 60, { download: true });
  if (signedUrlError) {
    return NextResponse.json({ error: "File unavailable." }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}
