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
  canUploadDocument,
  canViewFinancialExposure,
  canViewProject,
  canViewRisk,
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
  "risk:resolve",
  "action:assign",
  "document:upload",
  "members:manage",
  "organization:manage",
  "financial_exposure:view",
];

describe("central authorization service", () => {
  it("grants every current capability to an owner", () => {
    expect(canViewProject(owner)).toBe(true);
    expect(canEditProject(owner)).toBe(true);
    expect(canViewRisk(owner)).toBe(true);
    expect(canResolveRisk(owner)).toBe(true);
    expect(canAssignAction(owner)).toBe(true);
    expect(canUploadDocument(owner)).toBe(true);
    expect(canManageMembers(owner)).toBe(true);
    expect(canManageOrganization(owner)).toBe(true);
    expect(canViewFinancialExposure(owner)).toBe(true);
  });

  it("denies missing memberships and cross-organization resources", () => {
    expect(canViewProject(null)).toBe(false);
    expect(
      canViewRisk(owner, {
        organization_id: "20000000-0000-4000-8000-000000000002",
      }),
    ).toBe(false);
  });

  it("keeps future roles deny-by-default until their policy is approved", () => {
    const futureRoles: readonly OrganizationRole[] = [
      "administrator",
      "manager",
      "contributor",
    ];
    for (const organizationRole of futureRoles) {
      for (const permission of permissions) {
        expect(can({ ...owner, organizationRole }, permission)).toBe(false);
      }
    }
  });

  it("uses one non-disclosing error for denied permission assertions", () => {
    expect(() => assertAuthorized(false)).toThrow(AuthorizationError);
    expect(() => assertAuthorized(false)).toThrow("Resource not found");
  });
});
