import { describe, expect, it } from "vitest";

import { ReleaseTrackingService } from "./service";
import type { Release } from "./types";

const base: Release = {
  id: "release-1",
  identifier: "2026.07.27",
  applicationVersion: "0.1.0",
  environment: "production",
  status: "deployed",
  deployedAt: "2026-07-27T12:00:00.000Z",
  commitSha: null,
  sourceReference: null,
  deployedBy: null,
  releaseNotes: "",
  rollbackStatus: "not_rolled_back",
  linkedFlags: [{ id: "flag-1", key: "new-risk-view", name: "Risk view" }],
  createdAt: "2026-07-27T12:00:00.000Z",
  updatedAt: "2026-07-27T12:00:00.000Z",
};

describe("ReleaseTrackingService", () => {
  it("creates releases with optional metadata safely omitted", async () => {
    const repository = {
      create: async () => base,
      update: async () => base,
      list: async () => [base],
      get: async () => base,
    };
    const result = await new ReleaseTrackingService(repository).create(
      {
        identifier: base.identifier,
        applicationVersion: base.applicationVersion,
        environment: base.environment,
        status: "deployed",
        deployedAt: base.deployedAt,
        commitSha: null,
        sourceReference: null,
        deployedBy: null,
        releaseNotes: "",
        featureFlagIds: ["10000000-0000-4000-8000-000000000001"],
      },
      "operator",
    );
    expect(result.linkedFlags[0]?.key).toBe("new-risk-view");
    expect(result.commitSha).toBeNull();
  });

  it("supports failed and rolled-back status recording", async () => {
    const updates: string[] = [];
    const repository = {
      create: async () => base,
      update: async (_id: string, input: { status: string }) => {
        updates.push(input.status);
        return {
          ...base,
          status: input.status === "failed" ? "failed" : "rolled_back",
        } as Release;
      },
      list: async () => [base],
      get: async () => base,
    };
    const service = new ReleaseTrackingService(repository);
    await service.update(
      base.id,
      {
        status: "failed",
        releaseNotes: "Health checks failed.",
        rollbackStatus: "not_rolled_back",
      },
      "operator",
    );
    await service.update(
      base.id,
      {
        status: "rolled_back",
        releaseNotes: "Rolled back.",
        rollbackStatus: "rolled_back",
      },
      "operator",
    );
    expect(updates).toEqual(["failed", "rolled_back"]);
  });

  it("passes filtering, sorting, and detail retrieval to persistence", async () => {
    let received: object | null = null;
    const repository = {
      create: async () => base,
      update: async () => base,
      list: async (input: object) => {
        received = input;
        return [base];
      },
      get: async (id: string) => (id === base.id ? base : null),
    };
    const service = new ReleaseTrackingService(repository);
    expect(
      await service.list({
        environment: "production",
        status: "deployed",
        order: "desc",
      }),
    ).toEqual([base]);
    expect(received).toEqual({
      environment: "production",
      status: "deployed",
      order: "desc",
    });
    expect(await service.get(base.id)).toEqual(base);
  });
});
