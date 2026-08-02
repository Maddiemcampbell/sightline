import { describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/auth/authorization";
import type { OrganizationMembership } from "@/features/organizations/types";
import type { TeamRepository } from "@/features/team/repository";
import { TeamService } from "@/features/team/service";

const organization = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "BuildCo",
  slug: "buildco",
  timezone: "America/Los_Angeles",
  createdByAuthUserId: "20000000-0000-4000-8000-000000000001",
  planKey: "essential",
} as const;

function actor(role: OrganizationMembership["role"]): OrganizationMembership {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    organizationId: organization.id,
    authUserId: organization.createdByAuthUserId,
    applicationUserId: "40000000-0000-4000-8000-000000000001",
    role,
    organization,
  };
}

const target = {
  id: "30000000-0000-4000-8000-000000000002",
  organizationId: organization.id,
  authUserId: "20000000-0000-4000-8000-000000000002",
  applicationUserId: "40000000-0000-4000-8000-000000000002",
  role: "manager",
} as const;

describe("TeamService", () => {
  it("changes an ordinary role after resolving the tenant-scoped target", async () => {
    const repository = {
      findMembership: vi.fn().mockResolvedValue(target),
      changeRole: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const service = new TeamService(repository);
    await expect(
      service.changeRole(actor("owner"), {
        membershipId: target.id,
        role: "contributor",
      }),
    ).resolves.toMatchObject({
      previousRole: "manager",
      nextRole: "contributor",
      ownershipTransferred: false,
    });
    expect(repository.changeRole).toHaveBeenCalledWith(
      organization.id,
      target.id,
      "contributor",
    );
  });

  it("requires explicit ownership confirmation and uses atomic transfer", async () => {
    const repository = {
      findMembership: vi.fn().mockResolvedValue(target),
      transferOwnership: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const service = new TeamService(repository);
    await expect(
      service.changeRole(actor("owner"), {
        membershipId: target.id,
        role: "owner",
      }),
    ).rejects.toThrow("Confirmation is required.");
    await service.changeRole(actor("owner"), {
      membershipId: target.id,
      role: "owner",
      confirmed: "yes",
    });
    expect(repository.transferOwnership).toHaveBeenCalledWith(
      organization.id,
      actor("owner").id,
      target.id,
    );
  });

  it("prevents contributors from promoting themselves", async () => {
    const repository = {
      findMembership: vi.fn().mockResolvedValue({
        ...target,
        id: actor("contributor").id,
        role: "contributor",
      }),
      changeRole: vi.fn(),
    } as unknown as TeamRepository;
    await expect(
      new TeamService(repository).changeRole(actor("contributor"), {
        membershipId: actor("contributor").id,
        role: "owner",
        confirmed: "yes",
      }),
    ).rejects.toThrow(AuthorizationError);
    expect(repository.changeRole).not.toHaveBeenCalled();
  });

  it("prevents owner self-removal and administrator removal by admins", async () => {
    const selfRepository = {
      findMembership: vi.fn().mockResolvedValue({
        ...target,
        id: actor("owner").id,
        role: "owner",
      }),
      removeMembership: vi.fn(),
    } as unknown as TeamRepository;
    await expect(
      new TeamService(selfRepository).removeMember(actor("owner"), {
        membershipId: actor("owner").id,
      }),
    ).rejects.toThrow(AuthorizationError);

    const adminRepository = {
      findMembership: vi.fn().mockResolvedValue({
        ...target,
        role: "administrator",
      }),
      removeMembership: vi.fn(),
    } as unknown as TeamRepository;
    await expect(
      new TeamService(adminRepository).removeMember(actor("administrator"), {
        membershipId: target.id,
      }),
    ).rejects.toThrow(AuthorizationError);
  });
});
