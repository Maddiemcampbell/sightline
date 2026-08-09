"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAuditEvent } from "@/features/audit/service";
import { MicrosoftGraphClient } from "@/features/microsoft365/client";
import { Microsoft365Repository } from "@/features/microsoft365/repository";
import { canManageIntegrations } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const siteUrlSchema = z
  .url()
  .refine(
    (value) => new URL(value).hostname.endsWith(".sharepoint.com"),
    "Enter a SharePoint Online site URL.",
  );

export async function addSharePointSiteAction(formData: FormData) {
  const context = await requireActorContext();
  if (!canManageIntegrations(context))
    throw new Error("Manager access required.");
  const siteUrl = siteUrlSchema.parse(String(formData.get("siteUrl") ?? ""));
  const repository = new Microsoft365Repository(createAdminSupabaseClient());
  const connection = await repository.connection(context.organizationId);
  if (!connection || connection.status === "disconnected") {
    throw new Error("Connect Microsoft 365 first.");
  }
  const graph = new MicrosoftGraphClient(connection.company_id);
  const site = await graph.resolveSite(siteUrl);
  const drives = await graph.drives(site.id);
  await repository.saveSiteDrives({
    organizationId: context.organizationId,
    connectionId: connection.id,
    site,
    drives,
  });
  revalidatePath("/integrations/microsoft365");
}

export async function saveLibraryMappingAction(formData: FormData) {
  const context = await requireActorContext();
  if (!canManageIntegrations(context))
    throw new Error("Manager access required.");
  const parsed = z
    .object({
      mappingId: z.uuid(),
      projectId: z.preprocess((value) => value || null, z.uuid().nullable()),
      selected: z.boolean(),
    })
    .parse({
      mappingId: formData.get("mappingId"),
      projectId: formData.get("projectId"),
      selected: formData.get("selected") === "on",
    });
  if (parsed.selected && !parsed.projectId) {
    throw new Error("Choose a project before enabling synchronization.");
  }
  const client = createAdminSupabaseClient();
  if (parsed.projectId) {
    const project = await client
      .from("projects")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", parsed.projectId)
      .maybeSingle();
    if (project.error) throw new Error(project.error.message);
    if (!project.data) throw new Error("Project not found.");
  }
  const { data, error } = await client
    .from("microsoft365_library_mappings")
    .update({
      project_id: parsed.projectId,
      selected: parsed.selected,
      last_error: null,
    })
    .eq("id", parsed.mappingId)
    .eq("organization_id", context.organizationId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Library not found.");
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "integration.microsoft365_library_mapped",
    resourceType: "microsoft365_library_mapping",
    resourceId: parsed.mappingId,
    metadata: { projectId: parsed.projectId, selected: parsed.selected },
  });
  revalidatePath("/integrations/microsoft365");
}

export async function syncMicrosoft365Action() {
  const context = await requireActorContext();
  if (!canManageIntegrations(context))
    throw new Error("Manager access required.");
  const client = createAdminSupabaseClient();
  const membership = await client
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("application_user_id", context.userId)
    .single();
  if (membership.error) throw new Error(membership.error.message);
  const { error } = await client.from("organization_job_runs").insert({
    organization_id: context.organizationId,
    job_type: "microsoft365_sync",
    trigger_source: "manual",
    idempotency_key: `microsoft365:${new Date().toISOString()}`,
    requested_by_membership_id: membership.data.id,
    max_attempts: 3,
  });
  if (error) throw new Error(error.message);
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "integration.microsoft365_sync_requested",
    resourceType: "integration_connection",
    metadata: { provider: "sharepoint" },
  });
  revalidatePath("/integrations/microsoft365");
}

export async function disconnectMicrosoft365Action() {
  const context = await requireActorContext();
  if (!canManageIntegrations(context))
    throw new Error("Manager access required.");
  const client = createAdminSupabaseClient();
  const connection = await new Microsoft365Repository(client).connection(
    context.organizationId,
  );
  if (!connection) return;
  const { error } = await client
    .from("integration_connections")
    .update({ status: "disconnected", current_error: null })
    .eq("id", connection.id)
    .eq("organization_id", context.organizationId);
  if (error) throw new Error(error.message);
  await client
    .from("integration_sources")
    .update({ is_active: false })
    .eq("organization_id", context.organizationId)
    .eq("provider", "sharepoint");
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "integration.microsoft365_disconnected",
    resourceType: "integration_connection",
    resourceId: connection.id,
    metadata: { provider: "sharepoint" },
  });
  revalidatePath("/integrations/microsoft365");
  revalidatePath("/integrations");
}
