import { describe, expect, it } from "vitest";

import {
  assertAuthorized,
  AuthorizationError,
  can,
  canAssignAction,
  canEditProject,
  canManageMembers,
  canManageOrganization,
  canResolveRisk,
  canEditRisk,
  canEditAction,
  canUploadDocument,
  canEditDocument,
  canViewDocument,
  canViewFinancialExposure,
  canViewProject,
  canViewRisk,
  canViewAuditLogs,
  canAccessInternalAdmin,
  canAssignProject,
  canAssignProjectActions,
  canResolveProjectRisks,
  canUploadProjectDocument,
  canViewProjectDocuments,
  type AuthorizationSubject,
  type OrganizationRole,
  type Permission,
} from "@/lib/auth/authorization";

const owner: AuthorizationSubject = {
  organizationId: "10000000-0000-4000-8000-000000000001",
  organizationRole: "owner",
};

const permissions: readonly Permission[] = [
  "project:view",
  "project:edit",
  "risk:view",
  "risk:edit",
  "risk:resolve",
  "action:edit",
  "action:complete",
  "action:assign",
  "document:view",
  "document:edit",
  "document:upload",
  "project_members:manage",
  "comment:create",
  "ai:use",
  "integrations:manage",
  "members:manage",
  "organization:manage",
  "financial_exposure:view",
  "audit:view",
  "internal_admin:access",
];

describe("central authorization service", () => {
  it("grants every current capability to an owner", () => {
    expect(canViewProject(owner)).toBe(true);
    expect(canEditProject(owner)).toBe(true);
    expect(canViewRisk(owner)).toBe(true);
    expect(canEditRisk(owner)).toBe(true);
    expect(canResolveRisk(owner)).toBe(true);
    expect(canEditAction(owner)).toBe(true);
    expect(canAssignAction(owner)).toBe(true);
    expect(canViewDocument(owner)).toBe(true);
    expect(canEditDocument(owner)).toBe(true);
    expect(canUploadDocument(owner)).toBe(true);
    expect(canManageMembers(owner)).toBe(true);
    expect(canManageOrganization(owner)).toBe(true);
    expect(canViewFinancialExposure(owner)).toBe(true);
    expect(canViewAuditLogs(owner)).toBe(true);
    expect(canAccessInternalAdmin(owner)).toBe(true);
  });

  it("denies missing memberships and cross-organization resources", () => {
    expect(canViewProject(null)).toBe(false);
    expect(
      canViewRisk(owner, {
        organization_id: "20000000-0000-4000-8000-000000000002",
      }),
    ).toBe(false);
  });

  it("implements the approved role capability matrix", () => {
    const allowed: Record<OrganizationRole, readonly Permission[]> = {
      owner: permissions,
      administrator: permissions.filter(
        (permission) =>
          permission !== "financial_exposure:view" &&
          permission !== "internal_admin:access",
      ),
      manager: [
        "project:view",
        "project:edit",
        "risk:view",
        "risk:edit",
        "risk:resolve",
        "action:edit",
        "action:complete",
        "action:assign",
        "document:view",
        "document:edit",
        "document:upload",
        "project_members:manage",
        "comment:create",
        "ai:use",
      ],
      contributor: [
        "project:view",
        "risk:view",
        "action:complete",
        "document:view",
        "document:upload",
        "comment:create",
      ],
    };
    for (const organizationRole of Object.keys(
      allowed,
    ) as OrganizationRole[]) {
      for (const permission of permissions)
        expect(can({ ...owner, organizationRole }, permission)).toBe(
          allowed[organizationRole].includes(permission),
        );
    }
  });

  it("requires project membership for scoped organization roles", () => {
    const manager = { ...owner, organizationRole: "manager" as const };
    const contributor = {
      ...owner,
      organizationRole: "contributor" as const,
    };
    const unassigned = {
      organization_id: owner.organizationId,
      projectRole: null,
    } as const;
    const managed = {
      organization_id: owner.organizationId,
      projectRole: "manager",
    } as const;
    const contributed = {
      organization_id: owner.organizationId,
      projectRole: "contributor",
    } as const;
    expect(canViewProject(manager, unassigned)).toBe(false);
    expect(canViewProject(manager, managed)).toBe(true);
    expect(canAssignProject(manager, managed)).toBe(true);
    expect(canResolveProjectRisks(manager, managed)).toBe(true);
    expect(canAssignProjectActions(manager, managed)).toBe(true);
    expect(canViewProjectDocuments(contributor, contributed)).toBe(true);
    expect(canUploadProjectDocument(contributor, contributed)).toBe(true);
    expect(canUploadProjectDocument(contributor, unassigned)).toBe(false);
  });

  it("gives organization owners automatic project access", () => {
    const unassigned = {
      organization_id: owner.organizationId,
      projectRole: null,
    } as const;
    expect(canViewProject(owner, unassigned)).toBe(true);
    expect(canAssignProject(owner, unassigned)).toBe(true);
  });

  it("uses one non-disclosing error for denied permission assertions", () => {
    expect(() => assertAuthorized(false)).toThrow(AuthorizationError);
    expect(() => assertAuthorized(false)).toThrow("Resource not found");
  });
});
