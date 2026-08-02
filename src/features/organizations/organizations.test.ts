import { describe, expect, it, vi } from "vitest";

import {
  assertAuthorized,
  canManageOrganization,
  AuthorizationError,
} from "@/lib/auth/authorization";
import type { OrganizationRepository } from "@/features/organizations/repository";
import {
  hashInvitationToken,
  OrganizationService,
  principalDisplayName,
} from "@/features/organizations/service";
import type { OrganizationMembership } from "@/features/organizations/types";
import {
  createOrganizationSchema,
  organizationSlugSchema,
} from "@/features/organizations/validation";
import type { RequestPrincipal } from "@/lib/auth/session";

const principal: RequestPrincipal = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "maddie.campbell@example.com",
  emailVerified: true,
};

const membership: OrganizationMembership = {
  id: "20000000-0000-4000-8000-000000000001",
  organizationId: "30000000-0000-4000-8000-000000000001",
  authUserId: principal.id,
  applicationUserId: "40000000-0000-4000-8000-000000000001",
  role: "owner",
  organization: {
    id: "30000000-0000-4000-8000-000000000001",
    name: "BuildCo",
    slug: "buildco",
    timezone: "America/Los_Angeles",
    createdByAuthUserId: principal.id,
    planKey: "essential",
  },
};

describe("organization validation", () => {
  it("normalizes valid slugs", () => {
    expect(organizationSlugSchema.parse("buildco-west")).toBe("buildco-west");
  });

  it("rejects unsafe slugs and blank names", () => {
    expect(() => organizationSlugSchema.parse("../BuildCo")).toThrow();
    expect(() =>
      createOrganizationSchema.parse({ name: "", slug: "buildco" }),
    ).toThrow();
  });
});

describe("organization authorization", () => {
  it("allows the initial owner membership", () => {
    expect(canManageOrganization(membership)).toBe(true);
    expect(() =>
      assertAuthorized(canManageOrganization(membership)),
    ).not.toThrow();
  });

  it("denies a missing membership", () => {
    expect(canManageOrganization(null)).toBe(false);
    expect(() => assertAuthorized(canManageOrganization(null))).toThrow(
      AuthorizationError,
    );
  });
});

describe("OrganizationService", () => {
  it("creates an organization for the verified principal", async () => {
    const repository = {
      createOrganization: vi.fn().mockResolvedValue(membership.id),
      listMemberships: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([membership]),
    } as unknown as OrganizationRepository;
    const service = new OrganizationService(repository);

    await expect(
      service.createOrganization(principal, {
        name: "BuildCo",
        slug: "buildco",
      }),
    ).resolves.toBe(membership.organizationId);
    expect(repository.createOrganization).toHaveBeenCalledWith({
      authUserId: principal.id,
      email: principal.email,
      fullName: "Maddie Campbell",
      name: "BuildCo",
      slug: "buildco",
    });
  });

  it("checks membership before updating an organization", async () => {
    const repository = {
      findMembership: vi.fn().mockResolvedValue(null),
      updateOrganization: vi.fn(),
    } as unknown as OrganizationRepository;
    const service = new OrganizationService(repository);

    await expect(
      service.updateOrganization(principal, membership.organizationId, {
        name: "BuildCo",
        slug: "buildco",
      }),
    ).rejects.toThrow(AuthorizationError);
    expect(repository.updateOrganization).not.toHaveBeenCalled();
  });
});

describe("invitation security", () => {
  it("hashes invitation tokens before persistence", () => {
    const token = "a".repeat(64);
    expect(hashInvitationToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitationToken(token)).not.toBe(token);
  });

  it("derives a readable initial profile name", () => {
    expect(principalDisplayName(principal)).toBe("Maddie Campbell");
  });
});
