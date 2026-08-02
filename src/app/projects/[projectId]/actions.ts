"use server";

import { redirect } from "next/navigation";

import { recordAuditEvent } from "@/features/audit/service";
import { ProjectRepository } from "@/features/projects/repository";
import { ProjectService } from "@/features/projects/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function setProjectArchivedAction(
  projectId: string,
  archived: boolean,
) {
  const context = await requireActorContext();
  try {
    await new ProjectService(
      new ProjectRepository(await createServerSupabaseClient()),
    ).setArchived(context, projectId, archived);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("plan_project_limit_reached"))
      redirect(`/projects/archived?error=limit`);
    throw error;
  }
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "settings.updated",
    resourceType: "project",
    resourceId: projectId,
    metadata: { event: archived ? "project.archived" : "project.restored" },
  });
  redirect(archived ? "/projects/archived" : `/projects/${projectId}`);
}
