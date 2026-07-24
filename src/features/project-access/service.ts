import { createHash, randomBytes } from "node:crypto";

import {
  assertAuthorized,
  canAssignProject,
  type ActorContext,
  type ProjectResource,
} from "@/lib/auth/authorization";
import { ProjectAccessRepository } from "@/features/project-access/repository";
import {
  projectAssignmentSchema,
  projectInvitationSchema,
  projectInvitationTokenSchema,
  projectRemovalSchema,
} from "@/features/project-access/validation";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

export function hashProjectInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class ProjectAccessService {
  constructor(private readonly repository: ProjectAccessRepository) {}

  async assignMany(
    context: ActorContext,
    actorMembershipId: string,
    resource: ProjectResource,
    input: unknown,
  ) {
    assertAuthorized(canAssignProject(context, resource));
    const value = projectAssignmentSchema.parse(input);
    await this.repository.assignMany({
      organizationId: context.organizationId,
      projectId: value.projectId,
      actorMembershipId,
      membershipIds: value.membershipIds,
      role: value.role,
    });
    return value;
  }

  async removeMany(
    context: ActorContext,
    resource: ProjectResource,
    input: unknown,
  ) {
    assertAuthorized(canAssignProject(context, resource));
    const value = projectRemovalSchema.parse(input);
    await this.repository.removeMany({
      organizationId: context.organizationId,
      projectId: value.projectId,
      membershipIds: value.membershipIds,
    });
    return value;
  }

  async invite(
    context: ActorContext,
    actorMembershipId: string,
    resource: ProjectResource,
    input: unknown,
  ) {
    assertAuthorized(canAssignProject(context, resource));
    const value = projectInvitationSchema.parse(input);
    const token = randomBytes(32).toString("hex");
    const invitationId = await this.repository.createInvitation({
      organizationId: context.organizationId,
      projectId: value.projectId,
      actorMembershipId,
      email: value.email,
      role: value.role,
      tokenHash: hashProjectInvitationToken(token),
      expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
    });
    return { ...value, token, invitationId };
  }

  async accept(input: {
    token: string;
    authUserId: string;
    email: string;
  }): Promise<string> {
    const token = projectInvitationTokenSchema.parse(input.token);
    return this.repository.acceptInvitation({
      tokenHash: hashProjectInvitationToken(token),
      authUserId: input.authUserId,
      email: input.email,
    });
  }
}
