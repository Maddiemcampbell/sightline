import "server-only";

import { createHash } from "node:crypto";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { platformCan } from "@/features/platform-admin/capabilities";
import { CustomerDirectoryRepository } from "@/features/platform-admin/customer-directory-repository";
import type {
  AdminDirectorySearchResult,
  AdminOperationalSignal,
  AdminOrganizationSummary,
  AdminUserSummary,
  OrganizationListInput,
  UserListInput,
} from "@/features/platform-admin/customer-directory-types";
import type {
  PlatformOperator,
  PlatformPermission,
} from "@/features/platform-admin/types";

export class PlatformServiceAuthorizationError extends Error {
  constructor() {
    super("Platform resource not found");
    this.name = "PlatformServiceAuthorizationError";
  }
}

export class ProductionOrganizationService {
  constructor(private readonly repository: CustomerDirectoryRepository) {}

  async list(operator: PlatformOperator, input: OrganizationListInput) {
    await authorize(
      operator,
      "platform.organizations.read",
      "platform.organization.list_view",
      "organization_directory",
    );
    return auditedRead(
      operator,
      "platform.organization.list_view",
      {
        resourceType: "organization_directory",
      },
      () => this.repository.listOrganizations(input),
      (result) => listAuditMetadata(input.query, result.total, input.page),
    );
  }

  async get(operator: PlatformOperator, organizationId: string) {
    await authorize(
      operator,
      "platform.organizations.read",
      "platform.organization.view",
      "organization",
      organizationId,
      organizationId,
    );
    const organization = await auditedRead(
      operator,
      "platform.organization.view",
      {
        resourceType: "organization",
        resourceId: organizationId,
        organizationId,
      },
      () => this.repository.getOrganization(organizationId),
    );
    if (!organization)
      await audit(operator, "platform.organization.not_found", {
        resourceType: "organization",
        resourceId: organizationId,
        organizationId,
        outcome: "failed",
        metadata: { reason: "not_found" },
      });
    return organization;
  }

  async members(operator: PlatformOperator, organizationId: string) {
    await authorize(
      operator,
      "platform.organizations.read",
      "platform.organization.members_view",
      "organization_members",
      organizationId,
      organizationId,
    );
    await authorize(
      operator,
      "platform.users.read",
      "platform.organization.members_view",
      "organization_members",
      organizationId,
      organizationId,
    );
    return auditedRead(
      operator,
      "platform.organization.members_view",
      {
        resourceType: "organization_members",
        resourceId: organizationId,
        organizationId,
      },
      () => this.repository.getOrganizationMembers(organizationId),
      (members) => ({
        resultCount: members.length,
      }),
    );
  }

  async activity(operator: PlatformOperator, organizationId: string) {
    await authorize(
      operator,
      "platform.audit.read",
      "platform.organization.activity_view",
      "organization_activity",
      organizationId,
      organizationId,
    );
    return auditedRead(
      operator,
      "platform.organization.activity_view",
      {
        resourceType: "organization_activity",
        resourceId: organizationId,
        organizationId,
      },
      () => this.repository.getOrganizationActivity(organizationId),
      (activity) => ({
        resultCount: activity.length,
      }),
    );
  }

  signals(organization: AdminOrganizationSummary): AdminOperationalSignal[] {
    return [
      signal(
        "jobs",
        "Failed background jobs",
        organization.failedJobCount,
        "/internal/admin/jobs",
      ),
      signal(
        "email",
        "Failed brief deliveries",
        organization.failedDeliveryCount,
        "/internal/admin/errors",
      ),
      signal(
        "exports",
        "Failed exports",
        organization.failedExportCount,
        "/internal/admin/errors",
      ),
      signal(
        "ai",
        "Failed AI requests",
        organization.failedAiCount,
        "/internal/admin/ai",
      ),
    ].filter((item) => item.count > 0);
  }
}

export class ProductionUserService {
  constructor(private readonly repository: CustomerDirectoryRepository) {}

  async list(operator: PlatformOperator, input: UserListInput) {
    await authorize(
      operator,
      "platform.users.read",
      "platform.user.list_view",
      "user_directory",
    );
    return auditedRead(
      operator,
      "platform.user.list_view",
      {
        resourceType: "user_directory",
      },
      () => this.repository.listUsers(input),
      (result) => listAuditMetadata(input.query, result.total, input.page),
    );
  }

  async get(operator: PlatformOperator, userId: string) {
    await authorize(
      operator,
      "platform.users.read",
      "platform.user.view",
      "auth_user",
      userId,
      undefined,
      userId,
    );
    const user = await auditedRead(
      operator,
      "platform.user.view",
      {
        resourceType: "auth_user",
        resourceId: userId,
        affectedAuthUserId: userId,
      },
      () => this.repository.getUser(userId),
    );
    if (!user)
      await audit(operator, "platform.user.not_found", {
        resourceType: "auth_user",
        resourceId: userId,
        affectedAuthUserId: userId,
        outcome: "failed",
        metadata: { reason: "not_found" },
      });
    return user;
  }

  async memberships(operator: PlatformOperator, userId: string) {
    await authorize(
      operator,
      "platform.users.read",
      "platform.user.memberships_view",
      "user_memberships",
      userId,
      undefined,
      userId,
    );
    await authorize(
      operator,
      "platform.organizations.read",
      "platform.user.memberships_view",
      "user_memberships",
      userId,
      undefined,
      userId,
    );
    return auditedRead(
      operator,
      "platform.user.memberships_view",
      {
        resourceType: "user_memberships",
        resourceId: userId,
        affectedAuthUserId: userId,
      },
      () => this.repository.getUserMemberships(userId),
      (memberships) => ({
        resultCount: memberships.length,
      }),
    );
  }

  async activity(operator: PlatformOperator, userId: string) {
    await authorize(
      operator,
      "platform.audit.read",
      "platform.user.activity_view",
      "user_activity",
      userId,
      undefined,
      userId,
    );
    return auditedRead(
      operator,
      "platform.user.activity_view",
      {
        resourceType: "user_activity",
        resourceId: userId,
        affectedAuthUserId: userId,
      },
      () => this.repository.getUserActivity(userId),
      (activity) => ({
        resultCount: activity.length,
      }),
    );
  }

  async invitations(
    operator: PlatformOperator,
    user: Pick<AdminUserSummary, "id" | "email">,
  ) {
    await authorize(
      operator,
      "platform.users.read",
      "platform.user.invitations_view",
      "user_invitations",
      user.id,
      undefined,
      user.id,
    );
    return auditedRead(
      operator,
      "platform.user.invitations_view",
      {
        resourceType: "user_invitations",
        resourceId: user.id,
        affectedAuthUserId: user.id,
      },
      () =>
        user.email
          ? this.repository.getUserInvitations(user.email)
          : Promise.resolve([]),
      (invitations) => ({ resultCount: invitations.length }),
    );
  }
}

export class ProductionDirectorySearchService {
  constructor(private readonly repository: CustomerDirectoryRepository) {}

  async search(
    operator: PlatformOperator,
    query: string,
  ): Promise<AdminDirectorySearchResult[]> {
    const canOrganizations = platformCan(
      operator,
      "platform.organizations.read",
    );
    const canUsers = platformCan(operator, "platform.users.read");
    if (!canOrganizations && !canUsers) {
      await audit(operator, "platform.access.denied", {
        resourceType: "customer_directory",
        outcome: "denied",
        metadata: { reason: "missing_search_permission" },
      });
      throw new PlatformServiceAuthorizationError();
    }
    const [organizations, users] = await Promise.all([
      canOrganizations
        ? this.repository.searchOrganizations(query)
        : Promise.resolve([]),
      canUsers ? this.repository.searchUsers(query) : Promise.resolve([]),
    ]);
    return [
      ...organizations.map((organization) => ({
        type: "organization" as const,
        organization,
        rank: rankOrganization(organization, query),
      })),
      ...users.map((user) => ({
        type: "user" as const,
        user,
        rank: rankUser(user, query),
      })),
    ]
      .toSorted((left, right) => left.rank - right.rank)
      .slice(0, 10);
  }
}

async function authorize(
  operator: PlatformOperator,
  permission: PlatformPermission,
  action: string,
  resourceType: string,
  resourceId?: string,
  organizationId?: string,
  affectedAuthUserId?: string,
) {
  if (platformCan(operator, permission)) return;
  await audit(operator, "platform.access.denied", {
    resourceType,
    ...(resourceId ? { resourceId } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(affectedAuthUserId ? { affectedAuthUserId } : {}),
    outcome: "denied",
    metadata: { permission, attemptedAction: action },
  });
  throw new PlatformServiceAuthorizationError();
}

async function audit(
  operator: PlatformOperator,
  action: string,
  event: Omit<
    Parameters<typeof recordPlatformAuditEvent>[0],
    "operator" | "action"
  >,
) {
  await recordPlatformAuditEvent({ operator, action, ...event });
}

type PlatformAuditEvent = Omit<
  Parameters<typeof recordPlatformAuditEvent>[0],
  "operator" | "action"
>;

async function auditedRead<T>(
  operator: PlatformOperator,
  action: string,
  event: Omit<PlatformAuditEvent, "metadata" | "outcome">,
  operation: () => Promise<T>,
  successMetadata: (
    result: T,
  ) => NonNullable<PlatformAuditEvent["metadata"]> = () => ({}),
) {
  try {
    const result = await operation();
    await audit(operator, action, {
      ...event,
      outcome: "success",
      metadata: successMetadata(result),
    });
    return result;
  } catch (error) {
    await audit(operator, action, {
      ...event,
      outcome: "failed",
      metadata: { reason: "data_access_failure" },
    });
    throw error;
  }
}

function listAuditMetadata(query: string, resultCount: number, page: number) {
  return {
    searchType: searchType(query),
    queryHash: query ? normalizedHash(query) : null,
    queryLength: query.length,
    resultCount,
    page,
  };
}

export function normalizedHash(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function searchType(value: string) {
  if (!value) return "none";
  if (/^[0-9a-f-]{36}$/i.test(value)) return "id";
  if (value.includes("@")) return "email";
  return "text";
}

export function rankOrganization(
  organization: AdminOrganizationSummary,
  query: string,
) {
  const normalized = query.toLowerCase();
  if (organization.id.toLowerCase() === normalized) return 0;
  if (organization.name.toLowerCase() === normalized) return 1;
  if (organization.name.toLowerCase().startsWith(normalized)) return 2;
  return 3;
}

export function rankUser(user: AdminUserSummary, query: string) {
  const normalized = query.toLowerCase();
  if (user.id.toLowerCase() === normalized) return 0;
  if (user.email?.toLowerCase() === normalized) return 1;
  if (user.fullName.toLowerCase() === normalized) return 1;
  if (
    user.email?.toLowerCase().startsWith(normalized) ||
    user.fullName.toLowerCase().startsWith(normalized)
  )
    return 2;
  return 3;
}

function signal(
  type: AdminOperationalSignal["type"],
  label: string,
  count: number,
  href: string,
): AdminOperationalSignal {
  return { type, label, count, href };
}
