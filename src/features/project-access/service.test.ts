import { describe, expect, it, vi } from "vitest";

import type { ProjectAccessRepository } from "@/features/project-access/repository";
import { ProjectAccessService } from "@/features/project-access/service";
import {
  AuthorizationError,
  type ActorContext,
} from "@/lib/auth/authorization";

const organizationId = "10000000-0000-4000-8000-000000000001";
const projectId = "20000000-0000-4000-8000-000000000001";
const membershipId = "30000000-0000-4000-8000-000000000001";
const context: ActorContext = {
  authUserId: "40000000-0000-4000-8000-000000000001",
  userId: "50000000-0000-4000-8000-000000000001",
  organizationId,
  organizationRole: "manager",
  role: "project_manager",
};

describe("ProjectAccessService", () => {
  it("bulk assigns organization members inside an assigned managed project", async () => {
    const repository = {
      assignMany: vi.fn().mockResolvedValue(undefined),
    } as unknown as ProjectAccessRepository;
    const service = new ProjectAccessService(repository);
    await service.assignMany(
      context,
      membershipId,
      { organization_id: organizationId, projectRole: "manager" },
      {
        projectId,
        membershipIds: [membershipId],
        role: "viewer",
      },
    );
    expect(repository.assignMany).toHaveBeenCalledWith({
      organizationId,
      projectId,
      actorMembershipId: membershipId,
      membershipIds: [membershipId],
      role: "viewer",
    });
  });

  it("denies bulk assignment in an unrelated project", async () => {
    const repository = {
      assignMany: vi.fn(),
    } as unknown as ProjectAccessRepository;
    await expect(
      new ProjectAccessService(repository).assignMany(
        context,
        membershipId,
        { organization_id: organizationId, projectRole: null },
        {
          projectId,
          membershipIds: [membershipId],
          role: "viewer",
        },
      ),
    ).rejects.toThrow(AuthorizationError);
    expect(repository.assignMany).not.toHaveBeenCalled();
  });

  it("denies project contributors from assigning members", async () => {
    const repository = {
      assignMany: vi.fn(),
    } as unknown as ProjectAccessRepository;
    await expect(
      new ProjectAccessService(repository).assignMany(
        { ...context, organizationRole: "contributor" },
        membershipId,
        { organization_id: organizationId, projectRole: "contributor" },
        {
          projectId,
          membershipIds: [membershipId],
          role: "viewer",
        },
      ),
    ).rejects.toThrow(AuthorizationError);
  });
});
