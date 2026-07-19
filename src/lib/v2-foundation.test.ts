import { describe, expect, it } from "vitest";

import { createRecommendedActionSchema } from "@/domain/validation";
import { buildRiskActivityRecord } from "@/features/activity/service";
import {
  assertOrganizationAccess,
  assertSameOrganization,
  AuthorizationError,
  type ActorContext,
} from "@/lib/auth/authorization";
import { readV2FeatureFlags } from "@/lib/feature-flags";

const context: ActorContext = {
  organizationId: "10000000-0000-4000-8000-000000000001",
  userId: "11000000-0000-4000-8000-000000000001",
  role: "executive",
};

describe("V2 authorization boundary", () => {
  it("accepts resources in the actor organization", () => {
    expect(() =>
      assertOrganizationAccess(
        { organization_id: context.organizationId },
        context,
      ),
    ).not.toThrow();
    expect(() =>
      assertSameOrganization(context, context.organizationId),
    ).not.toThrow();
  });

  it("returns the same not-found error for absent and cross-tenant resources", () => {
    for (const resource of [null, { organization_id: crypto.randomUUID() }]) {
      expect(() => assertOrganizationAccess(resource, context)).toThrow(
        AuthorizationError,
      );
    }
  });
});

describe("V2 feature flags", () => {
  it("keeps all incomplete capabilities disabled by default", () => {
    expect(readV2FeatureFlags({})).toEqual({
      recommendedActions: false,
      aiEmailDrafting: false,
      riskQuestions: false,
      resolutionTracking: false,
      notifications: false,
    });
  });

  it("enables only explicitly true flags", () => {
    expect(
      readV2FeatureFlags({
        V2_RECOMMENDED_ACTIONS_ENABLED: "true",
        V2_NOTIFICATIONS_ENABLED: "false",
      }).recommendedActions,
    ).toBe(true);
  });
});

describe("V2 audit and action conventions", () => {
  it("derives tenant and actor identity from context, not mutation input", () => {
    const record = buildRiskActivityRecord(context, {
      riskId: "60000000-0000-4000-8000-000000000001",
      activityType: "action_updated",
      note: "Recommended action assigned.",
      metadata: { actionId: "action-1" },
      occurredAt: "2026-07-19T12:00:00.000Z",
    });
    expect(record).toMatchObject({
      organization_id: context.organizationId,
      actor_user_id: context.userId,
      activity_type: "action_updated",
    });
  });

  it("defaults new recommended actions to normal priority", () => {
    const action = createRecommendedActionSchema.parse({
      organizationId: context.organizationId,
      riskId: "60000000-0000-4000-8000-000000000001",
      title: "Confirm renewed certificate",
      description: "Obtain and verify the updated certificate.",
      createdBy: context.userId,
    });
    expect(action.priority).toBe("normal");
  });
});
