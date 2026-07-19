import { describe, expect, it } from "vitest";

import {
  buildRiskActivityRecord,
  riskActivityInputSchema,
} from "@/features/activity/service";
import { orderTimelineItems } from "@/features/activity/ordering";
import type { TimelineItem } from "@/features/activity/types";

const context = {
  organizationId: "10000000-0000-4000-8000-000000000001",
  userId: "11000000-0000-4000-8000-000000000001",
  role: "operations" as const,
};
const riskId = "60000000-0000-4000-8000-000000000001";

describe("risk activity", () => {
  it("orders newest first with a stable id tie-breaker", () => {
    const item = (id: string, occurredAt: string): TimelineItem => ({
      id,
      riskId,
      riskTitle: "Risk",
      projectName: null,
      activityType: "risk_updated",
      actorType: "system",
      actorName: null,
      summary: "Updated",
      mentionedNames: [],
      occurredAt,
    });
    expect(
      orderTimelineItems([
        item("00000000-0000-4000-8000-000000000001", "2026-07-18T10:00:00Z"),
        item("00000000-0000-4000-8000-000000000003", "2026-07-19T10:00:00Z"),
        item("00000000-0000-4000-8000-000000000002", "2026-07-19T10:00:00Z"),
      ]).map((entry) => entry.id.at(-1)),
    ).toEqual(["3", "2", "1"]);
  });

  it("derives actor identity from the authorized context", () => {
    expect(
      buildRiskActivityRecord(context, {
        riskId,
        activityType: "comment_added",
        summary: "Please review this notice.",
      }),
    ).toMatchObject({
      organization_id: context.organizationId,
      actor_type: "user",
      actor_user_id: context.userId,
    });
    expect(
      buildRiskActivityRecord(context, {
        riskId,
        activityType: "system_analysis_completed",
        actorType: "system",
        summary: "Rule analysis completed.",
      }),
    ).toMatchObject({ actor_type: "system", actor_user_id: null });
  });

  it("validates comment content and mention identifiers", () => {
    expect(
      riskActivityInputSchema.safeParse({
        riskId,
        activityType: "comment_added",
        summary: "",
        mentionedUserIds: [],
      }).success,
    ).toBe(false);
    expect(
      riskActivityInputSchema.safeParse({
        riskId,
        activityType: "comment_added",
        summary: "Please review.",
        mentionedUserIds: ["outside-organization"],
      }).success,
    ).toBe(false);
  });
});
