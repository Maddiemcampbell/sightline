import { describe, expect, it } from "vitest";

import {
  canChangeMemberRole,
  canRemoveMember,
  requiresRoleConfirmation,
} from "@/features/team/policy";

const owner = { membershipId: "owner", role: "owner" } as const;
const admin = { membershipId: "admin", role: "administrator" } as const;
const manager = { membershipId: "manager", role: "manager" } as const;
const contributor = {
  membershipId: "contributor",
  role: "contributor",
} as const;

describe("team role policy", () => {
  it("allows owners to assign every role to another non-owner", () => {
    for (const role of [
      "owner",
      "administrator",
      "manager",
      "contributor",
    ] as const)
      expect(canChangeMemberRole(owner, manager, role)).toBe(true);
  });

  it("prevents self-promotion and owner mutation", () => {
    expect(canChangeMemberRole(contributor, contributor, "owner")).toBe(false);
    expect(canChangeMemberRole(owner, owner, "administrator")).toBe(false);
    expect(canRemoveMember(owner, owner)).toBe(false);
  });

  it("limits administrators to non-administrator, non-owner targets", () => {
    expect(canChangeMemberRole(admin, manager, "contributor")).toBe(true);
    expect(canChangeMemberRole(admin, manager, "owner")).toBe(false);
    expect(canChangeMemberRole(admin, owner, "manager")).toBe(false);
    expect(canRemoveMember(admin, admin)).toBe(false);
  });

  it("requires confirmation for ownership and administrator downgrades", () => {
    expect(requiresRoleConfirmation("manager", "owner")).toBe(true);
    expect(requiresRoleConfirmation("administrator", "manager")).toBe(true);
    expect(requiresRoleConfirmation("manager", "contributor")).toBe(false);
  });
});
