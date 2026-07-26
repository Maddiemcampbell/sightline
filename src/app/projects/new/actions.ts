"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditEvent } from "@/features/audit/service";
import { ProjectRepository } from "@/features/projects/repository";
import { ProjectService } from "@/features/projects/service";
import { firstProjectSchema } from "@/features/projects/validation";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreateProjectState = Readonly<{
  message?: string;
  fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  let projectId: string;
  let context: Awaited<ReturnType<typeof requireActorContext>>;
  try {
    context = await requireActorContext();
    const input = firstProjectSchema.parse({
      name: formData.get("name"),
      projectNumber: formData.get("projectNumber"),
      addressLine1: formData.get("addressLine1"),
      city: formData.get("city"),
      stateCode: formData.get("stateCode"),
      postalCode: formData.get("postalCode"),
      startDate: formData.get("startDate"),
      targetCompletionDate: formData.get("targetCompletionDate"),
    });
    projectId = await new ProjectService(
      new ProjectRepository(await createServerSupabaseClient()),
    ).create(context, input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { fieldErrors: error.flatten().fieldErrors };
    }
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        fieldErrors: {
          projectNumber: [
            "That project number is already in use in this organization.",
          ],
        },
      };
    }
    return {
      message:
        "The project could not be created. Your organization is unchanged.",
    };
  }

  try {
    await recordAuditEvent({
      organizationId: context.organizationId,
      actorAuthUserId: context.authUserId,
      actorUserId: context.userId,
      action: "settings.updated",
      resourceType: "project",
      resourceId: projectId,
      metadata: { event: "project.created" },
    });
  } catch (error) {
    console.error("Project creation audit logging failed.", {
      projectId,
      organizationId: context.organizationId,
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }
  redirect(`/projects/${projectId}?welcome=project`);
}
