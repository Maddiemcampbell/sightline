import type { OrganizationRole } from "@/lib/auth/authorization";

export type AdminAccountStatus =
  | "active"
  | "pending_deletion"
  | "archived"
  | "unverified"
  | "suspended"
  | "deleted";

export type AdminOrganizationSummary = Readonly<{
  id: string;
  name: string;
  slug: string;
  status: "active" | "pending_deletion" | "archived";
  plan: null;
  createdAt: string;
  lastActivityAt: string | null;
  timezone: string;
  memberCount: number;
  activeProjectCount: number;
  storageBytes: number;
  failedJobCount: number;
  failedDeliveryCount: number;
  failedExportCount: number;
  failedAiCount: number;
  hasOperationalIssues: boolean;
}>;

export type AdminUserSummary = Readonly<{
  id: string;
  fullName: string;
  email: string | null;
  status: "active" | "unverified" | "suspended" | "deleted";
  createdAt: string;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  emailVerified: boolean;
  authProvider: string;
  mfaEnabled: boolean;
  membershipCount: number;
  organizationNames: readonly string[];
}>;

export type AdminOrganizationMember = Readonly<{
  membershipId: string | null;
  userId: string | null;
  fullName: string | null;
  email: string;
  role: OrganizationRole | Exclude<OrganizationRole, "owner">;
  membershipStatus: "active" | "invited";
  invitationStatus: "accepted" | "pending" | "none";
  joinedAt: string | null;
  lastLoginAt: string | null;
  mfaEnabled: boolean | null;
}>;

export type AdminMembership = Readonly<{
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationStatus: "active" | "pending_deletion" | "archived";
  role: OrganizationRole;
  joinedAt: string;
  lastActiveAt: string | null;
}>;

export type AdminSafeActivity = Readonly<{
  id: string;
  action: string;
  resourceType: string;
  outcome: "success" | "denied" | "failed";
  occurredAt: string;
}>;

export type AdminOperationalSignal = Readonly<{
  type: "jobs" | "email" | "exports" | "ai";
  label: string;
  count: number;
  href: string;
}>;

export type PageResult<T> = Readonly<{
  items: readonly T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}>;

export type OrganizationListInput = Readonly<{
  query: string;
  status: "all" | "active" | "pending_deletion" | "archived";
  members: "all" | "yes" | "no";
  issues: "all" | "yes" | "no";
  recentDays: "all" | 7 | 30 | 90;
  createdDays: "all" | 30 | 90 | 365;
  sort: "activity" | "created" | "name" | "members";
  page: number;
  pageSize: 10 | 25 | 50 | 100;
}>;

export type UserListInput = Readonly<{
  query: string;
  status: "all" | "active" | "unverified" | "suspended" | "deleted";
  membership: "all" | "yes" | "no";
  loginDays: "all" | "never" | 7 | 30 | 90;
  createdDays: "all" | 30 | 90 | 365;
  mfa: "all" | "yes" | "no";
  sort: "login" | "created" | "name" | "email";
  page: number;
  pageSize: 10 | 25 | 50 | 100;
}>;

export type AdminOrganizationDetail = Readonly<{
  organization: AdminOrganizationSummary;
  members: readonly AdminOrganizationMember[];
  activity: readonly AdminSafeActivity[];
  signals: readonly AdminOperationalSignal[];
}>;

export type AdminUserDetail = Readonly<{
  user: AdminUserSummary;
  memberships: readonly AdminMembership[];
  invitations: readonly Readonly<{
    organizationId: string;
    organizationName: string;
    status: "pending" | "accepted" | "expired" | "revoked";
    createdAt: string;
  }>[];
  activity: readonly AdminSafeActivity[];
  activeSessionCount: null;
  recentFailedLoginCount: null;
}>;

export type AdminDirectorySearchResult =
  | Readonly<{
      type: "organization";
      organization: AdminOrganizationSummary;
      rank: number;
    }>
  | Readonly<{
      type: "user";
      user: AdminUserSummary;
      rank: number;
    }>;
