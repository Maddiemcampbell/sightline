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
  role: Exclude<OrganizationRole, "owner">;
  createdAt: string;
  expiresAt: string;
  lastSentAt: string;
  sendCount: number;
  acceptedAt: string | null;
  revokedAt: string | null;
}>;

export type OrganizationMemberProfile = Readonly<{
  membershipId: string;
  applicationUserId: string;
  avatarUrl: string | null;
  email: string;
  fullName: string;
  role: OrganizationRole;
  lastActiveAt: string | null;
  assignedProjects: readonly Readonly<{ id: string; name: string }>[];
}>;
import type { OrganizationRole } from "@/lib/auth/authorization";
