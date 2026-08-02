import { describe, expect, it } from "vitest";

import { planEntitlements } from "./entitlements";

describe("launch plan entitlements", () => {
  it("limits Essential to five projects and one organization", () => {
    expect(planEntitlements("essential")).toMatchObject({
      name: "Essential",
      maxProjects: 5,
      maxOrganizationsPerUser: 1,
      organizationSwitchingEnabled: false,
    });
  });

  it("limits Professional to ten projects and one organization", () => {
    expect(planEntitlements("professional")).toMatchObject({
      name: "Professional",
      maxProjects: 10,
      maxOrganizationsPerUser: 1,
      organizationSwitchingEnabled: false,
    });
  });
});
