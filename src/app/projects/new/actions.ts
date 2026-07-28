"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditEvent } from "@/features/audit/service";
import { ProjectRepository } from "@/features/projects/repository";
import { ProjectService } from "@/features/projects/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreateProjectState = Readonly<{
  message?: string;
  fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;
  values?: CreateProjectFormValues;
  validationAttempt?: number;
}>;

export type CreateProjectFormValues = Readonly<{
  name: string;
  projectNumber: string;
  addressLine1: string;
  city: string;
  stateCode: string;
  postalCode: string;
  startDate: string;
  targetCompletionDate: string;
}>;

function submittedValues(formData: FormData): CreateProjectFormValues {
  const value = (name: keyof CreateProjectFormValues) => {
    const entry = formData.get(name);
    return typeof entry === "string" ? entry : "";
  };

  return {
    name: value("name"),
    projectNumber: value("projectNumber"),
    addressLine1: value("addressLine1"),
    city: value("city"),
    stateCode: value("stateCode"),
    postalCode: value("postalCode"),
    startDate: value("startDate"),
    targetCompletionDate: value("targetCompletionDate"),
  };
}

export async function createProjectAction(
  _state: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const values = submittedValues(formData);
  let projectId: string;
  let context: Awaited<ReturnType<typeof requireActorContext>>;
  try {
    context = await requireActorContext();
    projectId = await new ProjectService(
      new ProjectRepository(await createServerSupabaseClient()),
    ).create(context, values);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        fieldErrors: error.flatten().fieldErrors,
        values,
        validationAttempt: Date.now(),
      };
    }
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        fieldErrors: {
          projectNumber: [
            "That project number is already in use in this organization.",
          ],
        },
        values,
        validationAttempt: Date.now(),
      };
    }
    return {
      message:
        "The project could not be created. Your organization is unchanged.",
      values,
      validationAttempt: Date.now(),
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
