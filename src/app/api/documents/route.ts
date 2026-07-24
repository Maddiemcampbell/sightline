import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { validateDocumentAssociations } from "@/features/documents/data";
import { allowDocumentUpload } from "@/features/documents/rate-limit";
import {
  DOCUMENT_BUCKET,
  documentMetadataSchema,
  MAX_DOCUMENT_BYTES,
  validateUploadFile,
} from "@/features/documents/validation";
import { organizationStoragePath } from "@/features/documents/storage-isolation";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { requireActorContext } from "@/lib/auth/request-context";
import { assertAuthorized, canUploadDocument } from "@/lib/auth/authorization";

export async function POST(request: Request) {
  const context = await requireActorContext();
  assertAuthorized(canUploadDocument(context));
  const rateKey = `${context.organizationId}:${context.userId}`;
  if (!allowDocumentUpload(rateKey)) {
    return NextResponse.json(
      { error: "Too many uploads. Try again in one minute." },
      { status: 429 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_DOCUMENT_BYTES + 100_000) {
    return NextResponse.json(
      { error: "Files must be 10 MB or smaller." },
      { status: 413 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file." }, { status: 400 });
    }
    const metadata = documentMetadataSchema.parse({
      name: formData.get("name"),
      category: formData.get("category"),
      projectId: formData.get("projectId"),
      vendorId: formData.get("vendorId"),
      documentDate: formData.get("documentDate"),
    });
    const validatedFile = await validateUploadFile(file);
    await validateDocumentAssociations(metadata.projectId, metadata.vendorId);

    const client = await createServerSupabaseClient();
    const storageClient = createAdminSupabaseClient();
    const documentId = crypto.randomUUID();
    const storagePath = organizationStoragePath(
      context.organizationId,
      documentId,
      validatedFile.safeFilename,
    );
    const { error: storageError } = await storageClient.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, validatedFile.bytes, {
        contentType: validatedFile.mimeType,
        upsert: false,
      });
    if (storageError) throw new Error(storageError.message);

    const { error: documentError } = await client.from("documents").insert({
      id: documentId,
      organization_id: context.organizationId,
      project_id: metadata.projectId,
      vendor_id: metadata.vendorId,
      integration_source_id: null,
      name: metadata.name,
      document_type: metadata.category,
      storage_path: storagePath,
      original_filename: validatedFile.safeFilename,
      mime_type: validatedFile.mimeType,
      size_bytes: file.size,
      processing_status: "ready",
      archived_at: null,
      external_id: null,
      document_date: metadata.documentDate,
    });
    if (documentError) {
      await storageClient.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
      throw new Error(documentError.message);
    }

    const { error: activityError } = await client
      .from("document_activities")
      .insert({
        organization_id: context.organizationId,
        document_id: documentId,
        actor_user_id: context.userId,
        activity_type: "uploaded",
        note: "Document uploaded manually.",
        metadata: {
          filename: validatedFile.safeFilename,
          mime_type: validatedFile.mimeType,
          size_bytes: file.size,
        },
        occurred_at: new Date().toISOString(),
      });
    if (activityError) {
      await client
        .from("documents")
        .delete()
        .eq("organization_id", context.organizationId)
        .eq("id", documentId);
      await storageClient.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
      throw new Error(activityError.message);
    }

    return NextResponse.json({ documentId }, { status: 201 });
  } catch (error) {
    const message = publicUploadError(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function publicUploadError(error: unknown): string {
  if (error instanceof ZodError)
    return "Check the document metadata and try again.";
  if (error instanceof Error) {
    const safeMessages = [
      "Choose a non-empty file.",
      "Files must be 10 MB or smaller.",
      "Use a PDF, DOCX, CSV, JPG, or PNG file.",
      "The file type does not match its contents.",
      "Resource not found",
    ];
    if (safeMessages.includes(error.message)) return error.message;
  }
  return "The document could not be uploaded. Please try again.";
}
