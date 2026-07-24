import "server-only";

import {
  assertAuthorized,
  canViewProject,
  type ActorContext,
  type ProjectResource,
  type ProjectRole,
} from "@/lib/auth/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type ProjectAccessContext = Readonly<{
  actor: ActorContext;
  projectId: string;
  resource: ProjectResource;
}>;

export async function getProjectResource(
  context: ActorContext,
  projectId: string,
): Promise<ProjectResource | null> {
  const client = createAdminSupabaseClient();
  const { data: project, error } = await client
    .from("projects")
    .select("id,organization_id")
    .eq("organization_id", context.organizationId)
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return null;
  if (
    context.organizationRole === "owner" ||
    context.organizationRole === "administrator"
  )
    return { organization_id: project.organization_id, projectRole: null };
  const { data: assignment, error: assignmentError } = await client
    .from("project_memberships")
    .select("role")
    .eq("organization_id", context.organizationId)
    .eq("project_id", projectId)
    .eq("organization_membership_id", await currentMembershipId(context))
    .maybeSingle();
  if (assignmentError) throw new Error(assignmentError.message);
  return {
    organization_id: project.organization_id,
    projectRole: (assignment?.role as ProjectRole | undefined) ?? null,
  };
}

export async function requireProjectAccess(
  context: ActorContext,
  projectId: string,
): Promise<ProjectAccessContext> {
  const resource = await getProjectResource(context, projectId);
  assertAuthorized(Boolean(resource) && canViewProject(context, resource));
  return { actor: context, projectId, resource: resource! };
}

export async function requireRiskProjectAccess(
  context: ActorContext,
  riskId: string,
): Promise<ProjectAccessContext> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("risks")
    .select("project_id")
    .eq("organization_id", context.organizationId)
    .eq("id", riskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  assertAuthorized(Boolean(data?.project_id));
  return requireProjectAccess(context, data!.project_id!);
}

export async function requireActionProjectAccess(
  context: ActorContext,
  actionId: string,
): Promise<ProjectAccessContext> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("recommended_actions")
    .select("risk_id")
    .eq("organization_id", context.organizationId)
    .eq("id", actionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  assertAuthorized(Boolean(data));
  return requireRiskProjectAccess(context, data!.risk_id);
}

export async function requireEmailDraftProjectAccess(
  context: ActorContext,
  draftId: string,
): Promise<ProjectAccessContext> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("risk_email_drafts")
    .select("risk_id")
    .eq("organization_id", context.organizationId)
    .eq("id", draftId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  assertAuthorized(Boolean(data));
  return requireRiskProjectAccess(context, data!.risk_id);
}

async function currentMembershipId(context: ActorContext): Promise<string> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("auth_user_id", context.authUserId)
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
