"use server";

import { revalidatePath } from "next/cache";

import {
  BUILDCO_ORGANIZATION_ID,
  MATT_USER_ID,
} from "@/features/daily-brief/data";
import { assertOrganizationAccess } from "@/features/documents/authorization";
import { validateDocumentAssociations } from "@/features/documents/data";
import {
  archiveDocumentSchema,
  editDocumentSchema,
} from "@/features/documents/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function editDocumentAction(
  input: Parameters<typeof editDocumentSchema.parse>[0],
) {
  const value = editDocumentSchema.parse(input);
  const client = createAdminSupabaseClient();
  const { data: document, error } = await client
    .from("documents")
    .select(
      "organization_id,archived_at,name,document_type,project_id,vendor_id,document_date",
    )
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", value.documentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  assertOrganizationAccess(document, BUILDCO_ORGANIZATION_ID);
  if (document.archived_at)
    throw new Error("Archived documents cannot be edited.");
  await validateDocumentAssociations(value.projectId, value.vendorId);

  const { error: updateError } = await client
    .from("documents")
    .update({
      name: value.name,
      document_type: value.category,
      project_id: value.projectId,
      vendor_id: value.vendorId,
      document_date: value.documentDate,
    })
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", value.documentId);
  if (updateError) throw new Error(updateError.message);
  const { error: activityError } = await client
    .from("document_activities")
    .insert({
      organization_id: BUILDCO_ORGANIZATION_ID,
      document_id: value.documentId,
      actor_user_id: MATT_USER_ID,
      activity_type: "edited",
      note: "Document metadata updated.",
      metadata: { category: value.category },
      occurred_at: new Date().toISOString(),
    });
  if (activityError) {
    await client
      .from("documents")
      .update({
        name: document.name,
        document_type: document.document_type,
        project_id: document.project_id,
        vendor_id: document.vendor_id,
        document_date: document.document_date,
      })
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("id", value.documentId);
    throw new Error(activityError.message);
  }
  revalidatePath("/documents");
  revalidatePath(`/documents/${value.documentId}`);
}

export async function archiveDocumentAction(input: { documentId: string }) {
  const value = archiveDocumentSchema.parse(input);
  const client = createAdminSupabaseClient();
  const { data: document, error } = await client
    .from("documents")
    .select("organization_id,archived_at")
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", value.documentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  assertOrganizationAccess(document, BUILDCO_ORGANIZATION_ID);
  if (document.archived_at) return;
  const archivedAt = new Date().toISOString();
  const { error: updateError } = await client
    .from("documents")
    .update({ archived_at: archivedAt })
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", value.documentId);
  if (updateError) throw new Error(updateError.message);
  const { error: activityError } = await client
    .from("document_activities")
    .insert({
      organization_id: BUILDCO_ORGANIZATION_ID,
      document_id: value.documentId,
      actor_user_id: MATT_USER_ID,
      activity_type: "archived",
      note: "Document archived.",
      metadata: {},
      occurred_at: archivedAt,
    });
  if (activityError) {
    await client
      .from("documents")
      .update({ archived_at: null })
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("id", value.documentId);
    throw new Error(activityError.message);
  }
  revalidatePath("/documents");
  revalidatePath(`/documents/${value.documentId}`);
}
