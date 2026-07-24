import type { OrganizationMembership } from "@/features/organizations/types";

export class OrganizationAuthorizationError extends Error {
  constructor(message = "Organization access denied.") {
    super(message);
    this.name = "OrganizationAuthorizationError";
  }
}

export function canManageOrganization(
  membership: OrganizationMembership | null,
): boolean {
  return membership?.role === "owner";
}

export function assertCanManageOrganization(
  membership: OrganizationMembership | null,
): asserts membership is OrganizationMembership {
  if (!canManageOrganization(membership)) {
    throw new OrganizationAuthorizationError();
  }
}

export function assertMembership(
  membership: OrganizationMembership | null,
): asserts membership is OrganizationMembership {
  if (!membership) throw new OrganizationAuthorizationError();
}
