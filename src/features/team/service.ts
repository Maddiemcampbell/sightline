import { randomBytes } from "node:crypto";

import {
  assertAuthorized,
  canManageMembers,
  canManageProjectMembers,
  type OrganizationRole,
} from "@/lib/auth/authorization";
import {
  canChangeMemberRole,
  canRemoveMember,
  requiresRoleConfirmation,
} from "@/features/team/policy";
import {
  changeRoleSchema,
  assignProjectsSchema,
  invitationMutationSchema,
  membershipMutationSchema,
} from "@/features/team/validation";
import { TeamRepository } from "@/features/team/repository";
import { hashInvitationToken } from "@/features/organizations/service";
import type { OrganizationMembership } from "@/features/organizations/types";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

export class TeamService {
  constructor(private readonly repository: TeamRepository) {}

  async changeRole(
    actor: OrganizationMembership,
    input: unknown,
  ): Promise<{
    previousRole: OrganizationRole;
    nextRole: OrganizationRole;
    ownershipTransferred: boolean;
  }> {
    assertAuthorized(canManageMembers(actor));
    const value = changeRoleSchema.parse(input);
    const target = await this.repository.findMembership(
      actor.organizationId,
      value.membershipId,
    );
    if (!target) throw new Error("Member not found.");
    assertAuthorized(
      canChangeMemberRole(
        { membershipId: actor.id, role: actor.role },
        { membershipId: target.id, role: target.role },
        value.role,
      ),
      "You cannot assign this role.",
    );
    if (
      requiresRoleConfirmation(target.role, value.role) &&
      value.confirmed !== "yes"
    )
      throw new Error("Confirmation is required.");
    if (target.role === value.role) throw new Error("The role is unchanged.");
    if (value.role === "owner") {
      await this.repository.transferOwnership(
        actor.organizationId,
        actor.id,
        target.id,
      );
    } else {
      await this.repository.changeRole(
        actor.organizationId,
        target.id,
        value.role,
      );
    }
    return {
      previousRole: target.role,
      nextRole: value.role,
      ownershipTransferred: value.role === "owner",
    };
  }

  async removeMember(
    actor: OrganizationMembership,
    input: unknown,
  ): Promise<{ previousRole: OrganizationRole; targetMembershipId: string }> {
    assertAuthorized(canManageMembers(actor));
    const value = membershipMutationSchema.parse(input);
    const target = await this.repository.findMembership(
      actor.organizationId,
      value.membershipId,
    );
    if (!target) throw new Error("Member not found.");
    assertAuthorized(
      canRemoveMember(
        { membershipId: actor.id, role: actor.role },
        { membershipId: target.id, role: target.role },
      ),
      "You cannot remove this member.",
    );
    await this.repository.removeMembership(actor.organizationId, target.id);
    return { previousRole: target.role, targetMembershipId: target.id };
  }

  async revokeInvitation(
    actor: OrganizationMembership,
    input: unknown,
  ): Promise<string> {
    assertAuthorized(canManageMembers(actor));
    const { invitationId } = invitationMutationSchema.parse(input);
    await this.repository.revokeInvitation(
      actor.organizationId,
      invitationId,
    );
    return invitationId;
  }

  async resendInvitation(
    actor: OrganizationMembership,
    input: unknown,
  ): Promise<{ invitationId: string; token: string }> {
    assertAuthorized(canManageMembers(actor));
    const { invitationId } = invitationMutationSchema.parse(input);
    const token = randomBytes(32).toString("hex");
    await this.repository.resendInvitation(
      actor.organizationId,
      invitationId,
      new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
      hashInvitationToken(token),
    );
    return { invitationId, token };
  }

  async assignProjects(
    actor: OrganizationMembership,
    input: unknown,
  ): Promise<{ membershipId: string; projectIds: readonly string[] }> {
    assertAuthorized(canManageProjectMembers(actor));
    const value = assignProjectsSchema.parse(input);
    const target = await this.repository.findMembership(
      actor.organizationId,
      value.membershipId,
    );
    if (!target) throw new Error("Member not found.");
    await this.repository.replaceProjectAssignments({
      organizationId: actor.organizationId,
      actorMembershipId: actor.id,
      targetMembershipId: target.id,
      projectIds: value.projectIds,
    });
    return { membershipId: target.id, projectIds: value.projectIds };
  }
}
