import { describe, expect, it, vi } from "vitest";

import type { ProjectWriter } from "@/features/projects/repository";
import { ProjectService } from "@/features/projects/service";
import {
  AuthorizationError,
  type ActorContext,
} from "@/lib/auth/authorization";

const context: ActorContext = {
  authUserId: "10000000-0000-4000-8000-000000000001",
  userId: "11000000-0000-4000-8000-000000000001",
  organizationId: "12000000-0000-4000-8000-000000000001",
  organizationRole: "owner",
  role: "admin",
};
const input = {
  name: "First Project",
  projectNumber: "SL-001",
  addressLine1: "",
  city: "Oakland",
  stateCode: "ca",
  postalCode: "",
  startDate: "2026-07-26",
  targetCompletionDate: "2027-07-26",
};

describe("ProjectService onboarding creation", () => {
  it("creates an organization-owned project for an Owner", async () => {
    const repository: ProjectWriter = {
      create: vi.fn().mockResolvedValue("project-id"),
      setArchived: vi.fn(),
    };
    await expect(
      new ProjectService(repository).create(context, input),
    ).resolves.toBe("project-id");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: context.organizationId,
        updatedByUserId: context.userId,
        stateCode: "CA",
      }),
    );
  });

  it("creates a project when every optional form field is blank", async () => {
    const repository: ProjectWriter = {
      create: vi.fn().mockResolvedValue("project-id"),
      setArchived: vi.fn(),
    };

    await expect(
      new ProjectService(repository).create(context, {
        name: "Required Fields Only",
        projectNumber: "SL-002",
        addressLine1: "",
        city: "",
        stateCode: "",
        postalCode: "",
        startDate: "",
        targetCompletionDate: "",
      }),
    ).resolves.toBe("project-id");

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        addressLine1: null,
        city: null,
        stateCode: null,
        postalCode: null,
        startDate: null,
        targetCompletionDate: null,
      }),
    );
  });

  it("allows Administrators and denies lower organization roles", async () => {
    const repository: ProjectWriter = {
      create: vi.fn().mockResolvedValue("project-id"),
      setArchived: vi.fn(),
    };
    await expect(
      new ProjectService(repository).create(
        { ...context, organizationRole: "administrator" },
        input,
      ),
    ).resolves.toBe("project-id");
    for (const organizationRole of ["manager", "contributor"] as const) {
      await expect(
        new ProjectService(repository).create(
          { ...context, organizationRole },
          input,
        ),
      ).rejects.toThrow(AuthorizationError);
    }
  });

  it("rejects a completion date before the start date", async () => {
    const repository: ProjectWriter = {
      create: vi.fn(),
      setArchived: vi.fn(),
    };
    await expect(
      new ProjectService(repository).create(context, {
        ...input,
        targetCompletionDate: "2026-01-01",
      }),
    ).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
