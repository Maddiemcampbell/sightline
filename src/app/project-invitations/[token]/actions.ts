"use server";

import { redirect } from "next/navigation";

import { ProjectAccessRepository } from "@/features/project-access/repository";
import { ProjectAccessService } from "@/features/project-access/service";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function acceptProjectInvitationAction(
  token: string,
): Promise<void> {
  const principal = await requireAuthenticatedUser();
  const projectId = await new ProjectAccessService(
    new ProjectAccessRepository(createAdminSupabaseClient()),
  ).accept({
    token,
    authUserId: principal.id,
    email: principal.email,
  });
  redirect(`/projects/${projectId}`);
}
