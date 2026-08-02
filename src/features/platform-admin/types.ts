export const PLATFORM_PERMISSIONS = [
  "platform.dashboard.read",
  "platform.organizations.read",
  "platform.users.read",
  "platform.audit.read",
  "platform.jobs.read",
  "platform.jobs.retry",
  "platform.ai.read",
  "platform.health.read",
  "platform.support.read",
  "platform.support.write",
  "platform.flags.manage",
  "platform.releases.read",
  "platform.admin.manage",
  "platform.provisioning.manage",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export type PlatformOperator = Readonly<{
  id: string;
  authUserId: string;
  email: string;
  displayName: string;
  status: "active" | "suspended";
  mfaRequired: boolean;
  lastLoginAt: string | null;
  permissions: ReadonlySet<PlatformPermission>;
}>;

export type PlatformAuditOutcome = "success" | "denied" | "failed";
