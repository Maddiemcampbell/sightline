export type OrganizationRole =
  "owner" | "administrator" | "manager" | "contributor";
export type ProjectRole = "owner" | "manager" | "contributor" | "viewer";

export type Permission =
  | "project:view"
  | "project:edit"
  | "risk:view"
  | "risk:edit"
  | "risk:resolve"
  | "action:edit"
  | "action:complete"
  | "action:assign"
  | "document:view"
  | "document:edit"
  | "document:upload"
  | "project_members:manage"
  | "comment:create"
  | "ai:use"
  | "integrations:manage"
  | "members:manage"
  | "organization:manage"
  | "financial_exposure:view"
  | "audit:view"
  | "data_export:create"
  | "internal_admin:access";

export type AuthorizationSubject =
  | Readonly<{
      organizationId: string;
      organizationRole: OrganizationRole;
    }>
  | Readonly<{
      organizationId: string;
      role: OrganizationRole;
    }>;

export type OrganizationResource = Readonly<{
  organization_id: string;
}>;

export type ProjectResource = OrganizationResource &
  Readonly<{
    projectRole: ProjectRole | null;
  }>;

export type ActorContext = AuthorizationSubject &
  Readonly<{
    authUserId: string;
    userId: string;
    role: "executive" | "operations" | "project_manager" | "admin";
  }>;

const OWNER_PERMISSIONS = {
  "project:view": true,
  "project:edit": true,
  "risk:view": true,
  "risk:edit": true,
  "risk:resolve": true,
  "action:edit": true,
  "action:complete": true,
  "action:assign": true,
  "document:view": true,
  "document:edit": true,
  "document:upload": true,
  "project_members:manage": true,
  "comment:create": true,
  "ai:use": true,
  "integrations:manage": true,
  "members:manage": true,
  "organization:manage": true,
  "financial_exposure:view": true,
  "audit:view": true,
  "data_export:create": true,
  "internal_admin:access": true,
} as const satisfies Record<Permission, boolean>;

const PERMISSIONS_BY_ROLE: Readonly<
  Record<OrganizationRole, Readonly<Record<Permission, boolean>>>
> = {
  owner: OWNER_PERMISSIONS,
  administrator: {
    ...OWNER_PERMISSIONS,
    "financial_exposure:view": false,
    "internal_admin:access": false,
  },
  manager: {
    ...denyAllPermissions(),
    "project:view": true,
    "project:edit": true,
    "risk:view": true,
    "risk:edit": true,
    "risk:resolve": true,
    "action:edit": true,
    "action:complete": true,
    "action:assign": true,
    "document:view": true,
    "document:edit": true,
    "document:upload": true,
    "project_members:manage": true,
    "comment:create": true,
    "ai:use": true,
  },
  contributor: {
    ...denyAllPermissions(),
    "project:view": true,
    "risk:view": true,
    "action:complete": true,
    "document:view": true,
    "document:upload": true,
    "comment:create": true,
  },
};

function denyAllPermissions(): Record<Permission, boolean> {
  return {
    "project:view": false,
    "project:edit": false,
    "risk:view": false,
    "risk:edit": false,
    "risk:resolve": false,
    "action:edit": false,
    "action:complete": false,
    "action:assign": false,
    "document:view": false,
    "document:edit": false,
    "document:upload": false,
    "project_members:manage": false,
    "comment:create": false,
    "ai:use": false,
    "integrations:manage": false,
    "members:manage": false,
    "organization:manage": false,
    "financial_exposure:view": false,
    "audit:view": false,
    "data_export:create": false,
    "internal_admin:access": false,
  };
}

export function canExportOrganizationData(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "data_export:create", resource);
}

export class AuthorizationError extends Error {
  readonly code = "NOT_FOUND";

  constructor(message = "Resource not found") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function can(
  subject: AuthorizationSubject | null,
  permission: Permission,
  resource?: OrganizationResource | null,
): boolean {
  if (!subject) return false;
  if (resource && resource.organization_id !== subject.organizationId) {
    return false;
  }
  const role =
    "organizationRole" in subject ? subject.organizationRole : subject.role;
  return PERMISSIONS_BY_ROLE[role][permission];
}

export function canViewProject(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | ProjectResource | null,
): boolean {
  return projectScopedCan(subject, "project:view", resource);
}

export function canEditProject(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | ProjectResource | null,
): boolean {
  if (!projectScopedCan(subject, "project:edit", resource)) return false;
  return (
    !isProjectResource(resource) ||
    hasOrganizationWideProjectAccess(subject) ||
    resource.projectRole === "owner" ||
    resource.projectRole === "manager"
  );
}

export function canAssignProject(
  subject: AuthorizationSubject | null,
  resource?: ProjectResource | null,
): boolean {
  if (!can(subject, "project_members:manage", resource)) return false;
  return (
    !resource ||
    hasOrganizationWideProjectAccess(subject) ||
    resource.projectRole === "owner" ||
    resource.projectRole === "manager"
  );
}

export function canViewProjectDocuments(
  subject: AuthorizationSubject | null,
  resource?: ProjectResource | null,
): boolean {
  return projectScopedCan(subject, "document:view", resource);
}

export function canUploadProjectDocument(
  subject: AuthorizationSubject | null,
  resource?: ProjectResource | null,
): boolean {
  return (
    projectScopedCan(subject, "document:upload", resource) &&
    (!resource ||
      hasOrganizationWideProjectAccess(subject) ||
      resource.projectRole === "owner" ||
      resource.projectRole === "manager" ||
      resource.projectRole === "contributor")
  );
}

export function canResolveProjectRisks(
  subject: AuthorizationSubject | null,
  resource?: ProjectResource | null,
): boolean {
  return (
    projectScopedCan(subject, "risk:resolve", resource) &&
    (!resource ||
      hasOrganizationWideProjectAccess(subject) ||
      resource.projectRole === "owner" ||
      resource.projectRole === "manager")
  );
}

export function canAssignProjectActions(
  subject: AuthorizationSubject | null,
  resource?: ProjectResource | null,
): boolean {
  return (
    projectScopedCan(subject, "action:assign", resource) &&
    (!resource ||
      hasOrganizationWideProjectAccess(subject) ||
      resource.projectRole === "owner" ||
      resource.projectRole === "manager")
  );
}

function projectScopedCan(
  subject: AuthorizationSubject | null,
  permission: Permission,
  resource?: OrganizationResource | ProjectResource | null,
): boolean {
  if (!can(subject, permission, resource)) return false;
  if (!isProjectResource(resource)) return true;
  return (
    hasOrganizationWideProjectAccess(subject) || resource.projectRole !== null
  );
}

function isProjectResource(
  resource?: OrganizationResource | ProjectResource | null,
): resource is ProjectResource {
  return Boolean(resource && "projectRole" in resource);
}

function hasOrganizationWideProjectAccess(
  subject: AuthorizationSubject | null,
): boolean {
  if (!subject) return false;
  const role =
    "organizationRole" in subject ? subject.organizationRole : subject.role;
  return role === "owner" || role === "administrator";
}

export function canViewRisk(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "risk:view", resource);
}

export function canResolveRisk(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "risk:resolve", resource);
}

export function canEditRisk(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "risk:edit", resource);
}

export function canEditAction(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "action:edit", resource);
}

export function canCompleteAction(
  subject: AuthorizationSubject | null,
): boolean {
  return can(subject, "action:complete");
}

export function canAssignAction(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "action:assign", resource);
}

export function canUploadDocument(
  subject: AuthorizationSubject | null,
): boolean {
  return can(subject, "document:upload");
}

export function canViewDocument(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "document:view", resource);
}

export function canEditDocument(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "document:edit", resource);
}

export function canManageMembers(
  subject: AuthorizationSubject | null,
): boolean {
  return can(subject, "members:manage");
}

export function canManageProjectMembers(
  subject: AuthorizationSubject | null,
): boolean {
  return can(subject, "project_members:manage");
}

export function canComment(subject: AuthorizationSubject | null): boolean {
  return can(subject, "comment:create");
}

export function canUseAi(subject: AuthorizationSubject | null): boolean {
  return can(subject, "ai:use");
}

export function canManageIntegrations(
  subject: AuthorizationSubject | null,
): boolean {
  return can(subject, "integrations:manage");
}

export function canManageOrganization(
  subject: AuthorizationSubject | null,
): boolean {
  return can(subject, "organization:manage");
}

export function canViewFinancialExposure(
  subject: AuthorizationSubject | null,
  resource?: OrganizationResource | null,
): boolean {
  return can(subject, "financial_exposure:view", resource);
}

export function canViewAuditLogs(
  subject: AuthorizationSubject | null,
): boolean {
  return can(subject, "audit:view");
}

export function canAccessInternalAdmin(
  subject: AuthorizationSubject | null,
  isPlatformOperator = false,
): boolean {
  return isPlatformOperator && can(subject, "internal_admin:access");
}

export function assertAuthorized(
  allowed: boolean,
  message = "Resource not found",
): asserts allowed {
  if (!allowed) throw new AuthorizationError(message);
}

export function assertOrganizationMember<T extends AuthorizationSubject>(
  subject: T | null,
): asserts subject is T {
  if (!subject) throw new AuthorizationError("Organization access denied.");
}

export function assertOrganizationAccess<T extends OrganizationResource>(
  resource: T | null,
  context: Pick<AuthorizationSubject, "organizationId">,
): asserts resource is T {
  if (!resource || resource.organization_id !== context.organizationId) {
    throw new AuthorizationError();
  }
}

export function assertSameOrganization(
  context: Pick<AuthorizationSubject, "organizationId">,
  organizationId: string,
): void {
  if (context.organizationId !== organizationId) {
    throw new AuthorizationError();
  }
}
