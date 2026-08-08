"use server";

import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/features/audit/service";
import { canManageIntegrations } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ProjectRepository } from "@/features/projects/repository";
import { ProjectService } from "@/features/projects/service";

export async function mapProcoreProjectAction(formData: FormData) {
  const context = await requireActorContext();
  if (!canManageIntegrations(context))
    throw new Error("Manager access required.");
  const mappingId = String(formData.get("mappingId") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const projectId = String(formData.get("projectId") ?? "") || null;
  const client = createAdminSupabaseClient();
  const mapping = await client
    .from("integration_project_mappings")
    .select("*")
    .eq("id", mappingId)
    .eq("organization_id", context.organizationId)
    .single();
  if (mapping.error) throw new Error(mapping.error.message);
  let targetProjectId = projectId;
  if (mode === "create") {
    targetProjectId = await new ProjectService(
      new ProjectRepository(client),
    ).create(context, {
      name: mapping.data.procore_project_name,
      projectNumber:
        mapping.data.procore_project_number ||
        `PROCORE-${mapping.data.procore_project_id}`,
      addressLine1: "",
      city: "",
      stateCode: "",
      postalCode: "",
      startDate: "",
      targetCompletionDate: "",
    });
  }
  const status =
    mode === "skip" ? "skipped" : mode === "create" ? "created" : "mapped";
  const { error } = await client
    .from("integration_project_mappings")
    .update({
      sightline_project_id: mode === "skip" ? null : targetProjectId,
      mapping_status: status,
      mapping_method:
        mode === "create" ? "created" : mode === "skip" ? "skipped" : "manual",
      approved_by_user_id: mode === "skip" ? null : context.userId,
    })
    .eq("id", mappingId)
    .eq("organization_id", context.organizationId);
  if (error) throw new Error(error.message);
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "integration.procore_project_mapped",
    resourceType: "integration_project_mapping",
    resourceId: mappingId,
    metadata: {
      mode,
      procoreProjectId: mapping.data.procore_project_id,
      sightlineProjectId: targetProjectId,
    },
  });
  revalidatePath("/integrations/procore/projects");
  revalidatePath("/integrations");
}
