import { describe, expect, it, vi } from "vitest";

import {
  runOrganizationJobsSequentially,
  uniqueOrganizationJobTargets,
} from "@/lib/tenancy/organization-jobs";

describe("organization background-job isolation", () => {
  it("creates exactly one explicit work target per organization", () => {
    expect(
      uniqueOrganizationJobTargets([
        { organization_id: "org-a", application_user_id: "user-a" },
        { organization_id: "org-a", application_user_id: "user-a-2" },
        { organization_id: "org-b", application_user_id: "user-b" },
      ]),
    ).toEqual([
      { organizationId: "org-a", actorUserId: "user-a" },
      { organizationId: "org-b", actorUserId: "user-b" },
    ]);
  });

  it("never combines organization contexts while processing jobs", async () => {
    const worker = vi.fn(
      async (target: { organizationId: string }) => target.organizationId,
    );
    const targets = [
      { organizationId: "org-a", actorUserId: "user-a" },
      { organizationId: "org-b", actorUserId: "user-b" },
    ];

    await expect(
      runOrganizationJobsSequentially(targets, worker),
    ).resolves.toEqual(["org-a", "org-b"]);
    expect(worker.mock.calls).toEqual([[targets[0]], [targets[1]]]);
  });
});
