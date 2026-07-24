"use server";

import { revalidatePath } from "next/cache";

import {
  auditIdentifier,
  recordAuditEvent,
} from "@/features/audit/service";
import { ProjectAccessRepository } from "@/features/project-access/repository";
import { ProjectAccessService } from "@/features/project-access/service";
import { TeamRepository } from "@/features/team/repository";
import { getServerEnv } from "@/lib/env";
import { requireActorContext } from "@/lib/auth/request-context";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type ProjectPermissionState = Readonly<{
  ok?: boolean;
  message?: string;
  invitationUrl?: string;
}>;

function dependencies() {
  const client = createAdminSupabaseClient();
  const repository = new ProjectAccessRepository(client);
  return {
    repository,
    service: new ProjectAccessService(repository),
    team: new TeamRepository(client),
  };
}

export async function assignProjectMembersAction(
  _state: ProjectPermissionState,
  formData: FormData,
): Promise<ProjectPermissionState> {
  try {
    const [context, membership] = await Promise.all([
      requireActorContext(),
      requireCurrentMembership(),
    ]);
    const projectId = String(formData.get("projectId") ?? "");
    const access = await requireProjectAccess(context, projectId);
    const { service, team } = dependencies();
    const result = await service.assignMany(
      context,
      membership.id,
      access.resource,
      {
        projectId,
        membershipIds: formData.getAll("membershipId"),
        role: formData.get("role"),
      },
    );
    await Promise.all([
      team.appendEvent({
        organizationId: context.organizationId,
        actorMembershipId: membership.id,
        eventType: "project_members_changed",
        summary: `${result.membershipIds.length} project member assignment(s) updated.`,
        metadata: {
          projectId,
          role: result.role,
          membershipIds: result.membershipIds,
        },
      }),
      recordAuditEvent({
        organizationId: context.organizationId,
        actorAuthUserId: context.authUserId,
        actorUserId: context.userId,
        action: "authorization.permission_changed",
        resourceType: "project_membership",
        resourceId: projectId,
        metadata: {
          operation: "bulk_assign",
          role: result.role,
          membershipIds: result.membershipIds,
        },
      }),
      ...result.membershipIds.map((recipientMembershipId) =>
        team.createNotification({
          organizationId: context.organizationId,
          recipientMembershipId,
          eventType: "project_access_assigned",
          payload: { projectId, role: result.role },
        }),
      ),
    ]);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, message: "Project access updated." };
  } catch {
    return { message: "Project access could not be updated." };
  }
}

export async function removeProjectMembersAction(
  _state: ProjectPermissionState,
  formData: FormData,
): Promise<ProjectPermissionState> {
  try {
    const [context, membership] = await Promise.all([
      requireActorContext(),
      requireCurrentMembership(),
    ]);
    const projectId = String(formData.get("projectId") ?? "");
    const access = await requireProjectAccess(context, projectId);
    const { service, team } = dependencies();
    const result = await service.removeMany(context, access.resource, {
      projectId,
      membershipIds: formData.getAll("membershipId"),
    });
    await Promise.all([
      team.appendEvent({
        organizationId: context.organizationId,
        actorMembershipId: membership.id,
        eventType: "project_members_changed",
        summary: `${result.membershipIds.length} project member assignment(s) removed.`,
        metadata: { projectId, membershipIds: result.membershipIds },
      }),
      recordAuditEvent({
        organizationId: context.organizationId,
        actorAuthUserId: context.authUserId,
        actorUserId: context.userId,
        action: "authorization.permission_changed",
        resourceType: "project_membership",
        resourceId: projectId,
        metadata: {
          operation: "bulk_remove",
          membershipIds: result.membershipIds,
        },
      }),
      ...result.membershipIds.map((recipientMembershipId) =>
        team.createNotification({
          organizationId: context.organizationId,
          recipientMembershipId,
          eventType: "project_access_removed",
          payload: { projectId },
        }),
      ),
    ]);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, message: "Project access removed." };
  } catch {
    return { message: "Project access could not be removed." };
  }
}

export async function inviteProjectMemberAction(
  _state: ProjectPermissionState,
  formData: FormData,
): Promise<ProjectPermissionState> {
  try {
    const [context, membership] = await Promise.all([
      requireActorContext(),
      requireCurrentMembership(),
    ]);
    const projectId = String(formData.get("projectId") ?? "");
    const access = await requireProjectAccess(context, projectId);
    const { service, team } = dependencies();
    const result = await service.invite(
      context,
      membership.id,
      access.resource,
      {
        projectId,
        email: formData.get("email"),
        role: formData.get("role"),
      },
    );
    await Promise.all([
      team.appendEvent({
        organizationId: context.organizationId,
        actorMembershipId: membership.id,
        eventType: "project_members_changed",
        summary: "A project invitation was created.",
        metadata: {
          projectId,
          invitationId: result.invitationId,
          role: result.role,
        },
      }),
      recordAuditEvent({
        organizationId: context.organizationId,
        actorAuthUserId: context.authUserId,
        actorUserId: context.userId,
        action: "invitation.created",
        resourceType: "project_invitation",
        resourceId: result.invitationId,
        metadata: {
          projectId,
          role: result.role,
          inviteeIdentifierHash: auditIdentifier(result.email),
        },
      }),
    ]);
    revalidatePath(`/projects/${projectId}`);
    return {
      ok: true,
      message: "Project invitation created.",
      invitationUrl: `${getServerEnv().APP_URL}/project-invitations/${result.token}`,
    };
  } catch {
    return { message: "Project invitation could not be created." };
  }
}
