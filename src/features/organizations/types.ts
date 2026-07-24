export type Organization = Readonly<{
  id: string;
  name: string;
  slug: string;
  timezone: string;
  createdByAuthUserId: string | null;
}>;

export type OrganizationMembership = Readonly<{
  id: string;
  organizationId: string;
  authUserId: string;
  applicationUserId: string;
  role: OrganizationRole;
  organization: Organization;
}>;

export type Invitation = Readonly<{
  id: string;
  organizationId: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}>;

export type OrganizationMemberProfile = Readonly<{
  membershipId: string;
  email: string;
  fullName: string;
  role: OrganizationRole;
}>;
import type { OrganizationRole } from "@/lib/auth/authorization";
