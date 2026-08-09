import "server-only";

import { MicrosoftGraphClient } from "./client";
import { Microsoft365Repository } from "./repository";
import type { DriveItem } from "./types";
import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  detectDocumentMime,
  sanitizeFilename,
} from "@/features/documents/validation";
import { organizationStoragePath } from "@/features/documents/storage-isolation";
import type { OrganizationJobMetrics } from "@/features/background-jobs/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const MAX_DELTA_PAGES = 100;

export async function syncMicrosoft365Connection(
  connectionId: string,
  organizationId: string,
): Promise<OrganizationJobMetrics> {
  const client = createAdminSupabaseClient();
  const repository = new Microsoft365Repository(client);
  const connection = await repository.connection(organizationId);
  if (
    !connection ||
    connection.id !== connectionId ||
    connection.status === "disconnected"
  ) {
    throw new Error("Microsoft 365 connection is unavailable.");
  }
  const mappings = await repository.mappings(organizationId, true);
  const graph = new MicrosoftGraphClient(connection.company_id);
  let imported = 0;
  let updated = 0;
  let archived = 0;
  let skipped = 0;

  await client
    .from("integration_connections")
    .update({
      last_attempted_sync_at: new Date().toISOString(),
      current_error: null,
    })
    .eq("id", connectionId)
    .eq("organization_id", organizationId);

  try {
    for (const mapping of mappings) {
      if (!mapping.project_id) {
        skipped += 1;
        continue;
      }
      const attemptedAt = new Date().toISOString();
      await client
        .from("microsoft365_library_mappings")
        .update({ last_attempted_at: attemptedAt, last_error: null })
        .eq("id", mapping.id)
        .eq("organization_id", organizationId);
      try {
        let next: string | null = mapping.delta_link;
        let finalDelta: string | null = null;
        for (
          let pageNumber = 0;
          pageNumber < MAX_DELTA_PAGES;
          pageNumber += 1
        ) {
          const page = await graph.delta(mapping.drive_id, next);
          for (const item of page.value) {
            const result = await syncDriveItem({
              organizationId,
              connectionId,
              projectId: mapping.project_id,
              integrationSourceId: mapping.integration_source_id,
              driveId: mapping.drive_id,
              graph,
              item,
            });
            if (result === "imported") imported += 1;
            else if (result === "updated") updated += 1;
            else if (result === "archived") archived += 1;
            else skipped += 1;
          }
          finalDelta = page["@odata.deltaLink"] ?? null;
          next = page["@odata.nextLink"] ?? null;
          if (!next) break;
          if (pageNumber === MAX_DELTA_PAGES - 1) {
            throw new Error(
              "SharePoint delta response exceeded the page limit.",
            );
          }
        }
        if (!finalDelta)
          throw new Error("SharePoint did not return a delta cursor.");
        const completedAt = new Date().toISOString();
        await client
          .from("microsoft365_library_mappings")
          .update({
            delta_link: finalDelta,
            last_completed_at: completedAt,
            last_error: null,
          })
          .eq("id", mapping.id)
          .eq("organization_id", organizationId);
        await client
          .from("integration_sources")
          .update({ last_synced_at: completedAt, is_active: true })
          .eq("id", mapping.integration_source_id)
          .eq("organization_id", organizationId);
      } catch (error) {
        await client
          .from("microsoft365_library_mappings")
          .update({
            last_error:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : "Synchronization failed.",
          })
          .eq("id", mapping.id)
          .eq("organization_id", organizationId);
        throw error;
      }
    }
    await client
      .from("integration_connections")
      .update({
        status: "active",
        current_error: null,
        last_successful_sync_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .eq("organization_id", organizationId);
    return { libraries: mappings.length, imported, updated, archived, skipped };
  } catch (error) {
    await client
      .from("integration_connections")
      .update({
        status: "sync_error",
        current_error:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Synchronization failed.",
      })
      .eq("id", connectionId)
      .eq("organization_id", organizationId);
    throw error;
  }
}

async function syncDriveItem(input: {
  organizationId: string;
  connectionId: string;
  projectId: string;
  integrationSourceId: string;
  driveId: string;
  graph: MicrosoftGraphClient;
  item: DriveItem;
}): Promise<"imported" | "updated" | "archived" | "skipped"> {
  if (input.item.folder) return "skipped";
  const client = createAdminSupabaseClient();
  const externalId = `${input.driveId}:${input.item.id}`;
  const existingRecord = await client
    .from("integration_external_records")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("provider", "sharepoint")
    .eq("resource_type", "drive_item")
    .eq("external_id", externalId)
    .maybeSingle();
  if (existingRecord.error) throw new Error(existingRecord.error.message);

  if (input.item.deleted) {
    if (existingRecord.data?.sightline_record_id) {
      const archivedAt = new Date().toISOString();
      const result = await client
        .from("documents")
        .update({ archived_at: archivedAt })
        .eq("id", existingRecord.data.sightline_record_id)
        .eq("organization_id", input.organizationId);
      if (result.error) throw new Error(result.error.message);
      return "archived";
    }
    return "skipped";
  }
  if (!input.item.file || !isSupportedFilename(input.item.name))
    return "skipped";
  if ((input.item.size ?? 0) > MAX_DOCUMENT_BYTES) return "skipped";
  const checksum =
    input.item.file.hashes?.sha256Hash ??
    input.item.file.hashes?.quickXorHash ??
    input.item.eTag ??
    null;
  if (existingRecord.data?.content_checksum === checksum && checksum) {
    return "skipped";
  }

  const bytes = await input.graph.download(input.driveId, input.item.id);
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) return "skipped";
  const safeFilename = sanitizeFilename(input.item.name);
  const mimeType = detectDocumentMime(bytes, safeFilename);
  if (!mimeType) return "skipped";
  const documentId =
    existingRecord.data?.sightline_record_id ?? crypto.randomUUID();
  const storagePath = organizationStoragePath(
    input.organizationId,
    documentId,
    safeFilename,
  );
  const uploaded = await client.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: true,
    });
  if (uploaded.error) throw new Error(uploaded.error.message);

  const document = await client
    .from("documents")
    .upsert({
      id: documentId,
      organization_id: input.organizationId,
      project_id: input.projectId,
      vendor_id: null,
      integration_source_id: input.integrationSourceId,
      name: input.item.name.slice(0, 240),
      document_type: "other",
      storage_path: storagePath,
      original_filename: safeFilename,
      mime_type: mimeType,
      size_bytes: bytes.byteLength,
      processing_status: "ready",
      archived_at: null,
      external_id: externalId,
      document_date: input.item.lastModifiedDateTime?.slice(0, 10) ?? null,
    })
    .select("id")
    .single();
  if (document.error) throw new Error(document.error.message);
  const observedAt = new Date().toISOString();
  const provenance = await client.from("integration_external_records").upsert(
    {
      organization_id: input.organizationId,
      connection_id: input.connectionId,
      provider: "sharepoint",
      resource_type: "drive_item",
      external_id: externalId,
      sightline_project_id: input.projectId,
      sightline_record_id: documentId,
      external_updated_at: input.item.lastModifiedDateTime ?? null,
      source_url: input.item.webUrl ?? null,
      content_checksum: checksum,
      last_observed_at: observedAt,
    },
    { onConflict: "organization_id,provider,resource_type,external_id" },
  );
  if (provenance.error) throw new Error(provenance.error.message);
  return existingRecord.data ? "updated" : "imported";
}

function isSupportedFilename(filename: string) {
  return /\.(pdf|docx|csv|jpe?g|png)$/i.test(filename);
}

export async function queuedMicrosoft365Jobs() {
  const { data, error } = await createAdminSupabaseClient()
    .from("organization_job_runs")
    .select("*")
    .eq("job_type", "microsoft365_sync")
    .in("status", ["queued", "failed"])
    .order("created_at")
    .limit(25);
  if (error) throw new Error(error.message);
  return data;
}
