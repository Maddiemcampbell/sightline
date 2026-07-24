import { createHash, randomBytes } from "node:crypto";

import {
  assertCanManageOrganization,
  assertMembership,
} from "@/features/organizations/authorization";
import { OrganizationRepository } from "@/features/organizations/repository";
import {
  createInvitationSchema,
  createOrganizationSchema,
  invitationTokenSchema,
  updateOrganizationSchema,
} from "@/features/organizations/validation";
import type { RequestPrincipal } from "@/lib/auth/session";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function principalDisplayName(principal: RequestPrincipal): string {
  const localPart = principal.email.split("@")[0] ?? "Sightline user";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async createOrganization(
    principal: RequestPrincipal,
    input: unknown,
  ): Promise<string> {
    const value = createOrganizationSchema.parse(input);
    const membershipId = await this.repository.createOrganization({
      authUserId: principal.id,
      email: principal.email,
      fullName: principalDisplayName(principal),
      name: value.name,
      slug: value.slug,
    });
    const memberships = await this.repository.listMemberships(principal.id);
    const membership = memberships.find((item) => item.id === membershipId);
    if (!membership) throw new Error("Created organization could not be loaded.");
    return membership.organizationId;
  }

  async updateOrganization(
    principal: RequestPrincipal,
    organizationId: string,
    input: unknown,
  ): Promise<void> {
    const membership = await this.repository.findMembership(
      principal.id,
      organizationId,
    );
    assertCanManageOrganization(membership);
    await this.repository.updateOrganization(
      organizationId,
      updateOrganizationSchema.parse(input),
    );
  }

  async createInvitation(
    principal: RequestPrincipal,
    organizationId: string,
    input: unknown,
  ): Promise<string> {
    const membership = await this.repository.findMembership(
      principal.id,
      organizationId,
    );
    assertCanManageOrganization(membership);
    const { email } = createInvitationSchema.parse(input);
    const token = randomBytes(32).toString("hex");
    await this.repository.createInvitation({
      organizationId,
      email,
      tokenHash: hashInvitationToken(token),
      invitedByMembershipId: membership.id,
      expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
    });
    return token;
  }

  async acceptInvitation(
    principal: RequestPrincipal,
    token: string,
  ): Promise<string> {
    invitationTokenSchema.parse(token);
    const membershipId = await this.repository.acceptInvitation({
      tokenHash: hashInvitationToken(token),
      authUserId: principal.id,
      email: principal.email.toLowerCase(),
      fullName: principalDisplayName(principal),
    });
    const memberships = await this.repository.listMemberships(principal.id);
    const membership = memberships.find((item) => item.id === membershipId);
    if (!membership) throw new Error("Accepted organization could not be loaded.");
    return membership.organizationId;
  }

  async leaveOrganization(
    principal: RequestPrincipal,
    organizationId: string,
  ): Promise<void> {
    const membership = await this.repository.findMembership(
      principal.id,
      organizationId,
    );
    assertMembership(membership);
    await this.repository.leaveOrganization(membership.id, principal.id);
  }
}
