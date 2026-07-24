"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAuditEvents } from "@/features/audit/service";
import { TeamRepository } from "@/features/team/repository";
import { TeamService } from "@/features/team/service";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";

export type TeamActionState = Readonly<{
  ok?: boolean;
  message?: string;
  removedMembershipId?: string;
  changedMembershipId?: string;
  role?: string;
  revokedInvitationId?: string;
  resentInvitationId?: string;
  invitationUrl?: string;
}>;

function dependencies() {
  const repository = new TeamRepository(createAdminSupabaseClient());
  return { repository, service: new TeamService(repository) };
}

function failure(error: unknown): TeamActionState {
  if (error instanceof z.ZodError)
    return { message: "Check the requested team change and try again." };
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("Confirmation") ||
    message.includes("cannot") ||
    message.includes("unchanged") ||
    message.includes("not found")
  )
    return { message };
  return { message: "The team change could not be completed." };
}

export async function changeMemberRoleAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const actor = await requireCurrentMembership();
    const { repository, service } = dependencies();
    const membershipId = String(formData.get("membershipId") ?? "");
    const result = await service.changeRole(actor, {
      membershipId,
      role: formData.get("role"),
      confirmed: formData.get("confirmed") || undefined,
    });
    const eventType = result.ownershipTransferred
      ? "ownership_transferred"
      : "member_role_changed";
    await Promise.all([
      repository.appendEvent({
        organizationId: actor.organizationId,
        actorMembershipId: actor.id,
        targetMembershipId: membershipId,
        eventType,
        summary: result.ownershipTransferred
          ? "Organization ownership was transferred."
          : `A team member role changed from ${result.previousRole} to ${result.nextRole}.`,
        metadata: {
          fromRole: result.previousRole,
          toRole: result.nextRole,
        },
      }),
      repository.createNotification({
        organizationId: actor.organizationId,
        recipientMembershipId: membershipId,
        eventType,
        payload: {
          fromRole: result.previousRole,
          toRole: result.nextRole,
        },
      }),
      recordAuditEvents([
        {
          organizationId: actor.organizationId,
          actorAuthUserId: actor.authUserId,
          actorUserId: actor.applicationUserId,
          action: "authorization.permission_changed",
          resourceType: "organization_membership",
          resourceId: membershipId,
          metadata: {
            fromRole: result.previousRole,
            toRole: result.nextRole,
            ownershipTransferred: result.ownershipTransferred,
          },
        },
      ]),
    ]);
    revalidatePath("/settings/team");
    return {
      ok: true,
      message: result.ownershipTransferred
        ? "Ownership transferred."
        : "Role updated.",
      changedMembershipId: membershipId,
      role: result.nextRole,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function removeMemberAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const actor = await requireCurrentMembership();
    const { repository, service } = dependencies();
    const result = await service.removeMember(actor, {
      membershipId: formData.get("membershipId"),
    });
    await Promise.all([
      repository.appendEvent({
        organizationId: actor.organizationId,
        actorMembershipId: actor.id,
        eventType: "member_removed",
        summary: "A team member was removed.",
        metadata: {
          removedMembershipId: result.targetMembershipId,
          previousRole: result.previousRole,
        },
      }),
      recordAuditEvents([
        {
          organizationId: actor.organizationId,
          actorAuthUserId: actor.authUserId,
          actorUserId: actor.applicationUserId,
          action: "membership.deleted",
          resourceType: "organization_membership",
          resourceId: result.targetMembershipId,
          metadata: { previousRole: result.previousRole },
        },
        {
          organizationId: actor.organizationId,
          actorAuthUserId: actor.authUserId,
          actorUserId: actor.applicationUserId,
          action: "authorization.permission_changed",
          resourceType: "organization_membership",
          resourceId: result.targetMembershipId,
          metadata: { fromRole: result.previousRole, toRole: null },
        },
      ]),
    ]);
    revalidatePath("/settings/team");
    return {
      ok: true,
      message: "Member removed.",
      removedMembershipId: result.targetMembershipId,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeInvitationAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const actor = await requireCurrentMembership();
    const { repository, service } = dependencies();
    const invitationId = await service.revokeInvitation(actor, {
      invitationId: formData.get("invitationId"),
    });
    await repository.appendEvent({
      organizationId: actor.organizationId,
      actorMembershipId: actor.id,
      eventType: "invitation_revoked",
      summary: "A pending invitation was revoked.",
      metadata: { invitationId },
    });
    await recordAuditEvents([
      {
        organizationId: actor.organizationId,
        actorAuthUserId: actor.authUserId,
        actorUserId: actor.applicationUserId,
        action: "invitation.revoked",
        resourceType: "invitation",
        resourceId: invitationId,
        metadata: {},
      },
    ]);
    revalidatePath("/settings/team");
    return {
      ok: true,
      message: "Invitation revoked.",
      revokedInvitationId: invitationId,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resendInvitationAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const actor = await requireCurrentMembership();
    const { repository, service } = dependencies();
    const result = await service.resendInvitation(actor, {
      invitationId: formData.get("invitationId"),
    });
    const invitationId = result.invitationId;
    await repository.appendEvent({
      organizationId: actor.organizationId,
      actorMembershipId: actor.id,
      eventType: "invitation_resent",
      summary: "A pending invitation was resent.",
      metadata: { invitationId },
    });
    await Promise.all([
      repository.createNotification({
        organizationId: actor.organizationId,
        recipientMembershipId: null,
        eventType: "invitation_resent",
        payload: { invitationId },
      }),
      recordAuditEvents([
        {
          organizationId: actor.organizationId,
          actorAuthUserId: actor.authUserId,
          actorUserId: actor.applicationUserId,
          action: "invitation.resent",
          resourceType: "invitation",
          resourceId: invitationId,
          metadata: {},
        },
      ]),
    ]);
    revalidatePath("/settings/team");
    return {
      ok: true,
      message: "Invitation resent and extended for seven days.",
      resentInvitationId: invitationId,
      invitationUrl: `${getServerEnv().APP_URL}/invitations/${result.token}`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function assignMemberProjectsAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const actor = await requireCurrentMembership();
    const { repository, service } = dependencies();
    const result = await service.assignProjects(actor, {
      membershipId: formData.get("membershipId"),
      projectIds: formData.getAll("projectId"),
    });
    await Promise.all([
      repository.appendEvent({
        organizationId: actor.organizationId,
        actorMembershipId: actor.id,
        targetMembershipId: result.membershipId,
        eventType: "project_members_changed",
        summary: "A team member’s project assignments were updated.",
        metadata: { projectIds: result.projectIds },
      }),
      repository.createNotification({
        organizationId: actor.organizationId,
        recipientMembershipId: result.membershipId,
        eventType: "project_members_changed",
        payload: { projectIds: result.projectIds },
      }),
      recordAuditEvents([
        {
          organizationId: actor.organizationId,
          actorAuthUserId: actor.authUserId,
          actorUserId: actor.applicationUserId,
          action: "authorization.permission_changed",
          resourceType: "project_membership",
          resourceId: result.membershipId,
          metadata: { projectIds: result.projectIds },
        },
      ]),
    ]);
    revalidatePath("/settings/team");
    return {
      ok: true,
      message: "Project assignments updated.",
      changedMembershipId: result.membershipId,
    };
  } catch (error) {
    return failure(error);
  }
}
