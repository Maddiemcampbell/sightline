import { describe, expect, it } from "vitest";

import { createRecommendedActionSchema } from "@/domain/validation";
import {
  actionFiltersSchema,
  actionMutationSchema,
} from "@/features/actions/validation";

const ids = {
  organizationId: "10000000-0000-4000-8000-000000000001",
  riskId: "60000000-0000-4000-8000-000000000001",
  userId: "11000000-0000-4000-8000-000000000001",
  actionId: "80000000-0000-4000-8000-000000000001",
};

describe("recommended action validation", () => {
  it("creates a suggested action with explicit ownership and provenance", () => {
    const action = createRecommendedActionSchema.parse({
      organizationId: ids.organizationId,
      riskId: ids.riskId,
      title: "Request renewed certificate",
      description: "Contact the subcontractor before mobilization.",
      actionType: "request_document",
      ownerUserId: ids.userId,
      createdBy: ids.userId,
      source: "deterministic_rule",
    });
    expect(action).toMatchObject({
      status: "suggested",
      priority: "normal",
      completedAt: null,
      dismissedAt: null,
    });
  });

  it("retains a required reason for dismissed actions", () => {
    expect(() =>
      createRecommendedActionSchema.parse({
        organizationId: ids.organizationId,
        riskId: ids.riskId,
        title: "Call vendor",
        description: "Confirm corrective action.",
        createdBy: ids.userId,
        status: "dismissed",
        dismissedAt: new Date().toISOString(),
        dismissalReason: null,
      }),
    ).toThrow(/reason/i);
    const value = actionMutationSchema.parse({
      operation: "dismiss",
      actionId: ids.actionId,
      reason: "Duplicate of the executed notice.",
    });
    expect(value.operation === "dismiss" && value.reason).toContain(
      "Duplicate",
    );
  });

  it("rejects malformed due dates and owner IDs", () => {
    expect(
      actionMutationSchema.safeParse({
        operation: "due_date",
        actionId: ids.actionId,
        dueAt: "tomorrow",
      }).success,
    ).toBe(false);
    expect(
      actionMutationSchema.safeParse({
        operation: "assign",
        actionId: ids.actionId,
        ownerUserId: "outside-org",
      }).success,
    ).toBe(false);
  });
});

describe("shareable action filters", () => {
  it("normalizes invalid URL values to safe defaults", () => {
    expect(
      actionFiltersSchema.parse({
        status: "unknown",
        due: "late",
        priority: "critical",
      }),
    ).toMatchObject({ status: "all", due: "all", priority: "all" });
  });
});
