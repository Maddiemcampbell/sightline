import { describe, expect, it } from "vitest";

import { platformMfaDecision } from "./authorization";
import { assertOperatorUpdateAllowed } from "./operator-service";
import {
  createOperatorSchema,
  updateOperatorSchema,
} from "./operator-validation";
import type { PlatformPermission } from "./types";

const administrator = operator("00000000-0000-4000-8000-000000000001", [
  "platform.dashboard.read",
  "platform.admin.manage",
]);

describe("operator validation", () => {
  it("normalizes valid invitations and rejects empty capability sets", () => {
    expect(
      createOperatorSchema.parse({
        email: "OPERATOR@SIGHTLINE.COM",
        displayName: "  Operations  ",
        mfaRequired: true,
        permissions: ["platform.dashboard.read"],
      }),
    ).toMatchObject({
      email: "operator@sightline.com",
      displayName: "Operations",
    });
    expect(() =>
      createOperatorSchema.parse({
        email: "operator@sightline.com",
        displayName: "Operations",
        mfaRequired: true,
        permissions: [],
      }),
    ).toThrow();
  });
});

describe("operator lockout protections", () => {
  it("prevents self-suspension and removal of the actor's admin capability", () => {
    expect(() =>
      assertOperatorUpdateAllowed(
        update(administrator.id, "suspended", administrator.permissions),
        administrator,
        [administrator],
      ),
    ).toThrow("suspend your own");
    expect(() =>
      assertOperatorUpdateAllowed(
        update(administrator.id, "active", ["platform.dashboard.read"]),
        administrator,
        [administrator],
      ),
    ).toThrow("remove your own");
  });

  it("preserves at least one active administrator", () => {
    const actor = operator("00000000-0000-4000-8000-000000000002", [
      "platform.admin.manage",
    ]);
    expect(() =>
      assertOperatorUpdateAllowed(
        update(administrator.id, "suspended", administrator.permissions),
        actor,
        [administrator, operator(actor.id, [])],
      ),
    ).toThrow("At least one active");
    expect(() =>
      assertOperatorUpdateAllowed(
        update(administrator.id, "suspended", administrator.permissions),
        actor,
        [administrator, actor],
      ),
    ).not.toThrow();
  });
});

describe("operator MFA policy", () => {
  it("requires enrollment, challenge, or passes based on assurance state", () => {
    expect(platformMfaDecision(false, "aal1", "aal1")).toBe("pass");
    expect(platformMfaDecision(true, "aal2", "aal2")).toBe("pass");
    expect(platformMfaDecision(true, "aal1", "aal1")).toBe("enroll");
    expect(platformMfaDecision(true, "aal1", "aal2")).toBe("verify");
    expect(platformMfaDecision(true, null, null)).toBe("enroll");
  });
});

function operator(id: string, permissions: readonly PlatformPermission[]) {
  return {
    id,
    authUserId: id,
    email: "operator@sightline.com",
    displayName: "Operator",
    status: "active" as const,
    mfaRequired: true,
    lastLoginAt: null,
    createdAt: "2026-07-28T00:00:00.000Z",
    permissions: [...permissions],
  };
}

function update(
  id: string,
  status: "active" | "suspended",
  permissions: readonly PlatformPermission[],
) {
  return updateOperatorSchema.parse({
    id,
    displayName: "Operator",
    status,
    mfaRequired: true,
    permissions,
  });
}
