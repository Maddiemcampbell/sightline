import { describe, expect, it } from "vitest";

import {
  destinationForMembershipState,
  onboardingNext,
} from "@/lib/auth/onboarding-policy";

describe("onboarding policy", () => {
  it("rejects external and recursive auth destinations", () => {
    expect(onboardingNext("https://attacker.example")).toBeNull();
    expect(onboardingNext("//attacker.example")).toBeNull();
    expect(onboardingNext("/login?next=/")).toBeNull();
    expect(onboardingNext("/verify-email")).toBeNull();
  });

  it("preserves invitation links before organization creation", () => {
    expect(
      destinationForMembershipState({
        organizationId: null,
        projectCount: 0,
        next: "/invitations/secure-token",
      }),
    ).toBe("/invitations/secure-token");
  });

  it("preserves password recovery before organization creation", () => {
    expect(
      destinationForMembershipState({
        organizationId: null,
        projectCount: 0,
        next: "/reset-password",
      }),
    ).toBe("/reset-password");
  });

  it("routes verified users without memberships to organization creation", () => {
    expect(
      destinationForMembershipState({
        organizationId: null,
        projectCount: 0,
      }),
    ).toBe("/organizations/new");
  });

  it("routes an empty organization to first-project creation", () => {
    expect(
      destinationForMembershipState({
        organizationId: "10000000-0000-4000-8000-000000000001",
        projectCount: 0,
        welcome: "organization",
      }),
    ).toBe("/projects/new?welcome=organization");
  });

  it("routes an established organization to the homepage", () => {
    expect(
      destinationForMembershipState({
        organizationId: "10000000-0000-4000-8000-000000000001",
        projectCount: 1,
      }),
    ).toBe("/");
  });
});
