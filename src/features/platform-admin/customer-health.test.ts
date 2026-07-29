import { describe, expect, it } from "vitest";

import { toCustomerHealthSummary } from "@/features/platform-admin/customer-health-repository";

describe("customer health read model", () => {
  it("maps every operational health metric without customer content", () => {
    const health = toCustomerHealthSummary({
      id: "org-1",
      name: "BuildCo",
      slug: "buildco",
      account_status: "active",
      created_at: "2026-07-01T00:00:00.000Z",
      health_status: "watch",
      last_login_at: "2026-07-27T00:00:00.000Z",
      last_activity_at: "2026-07-28T00:00:00.000Z",
      job_failures_30d: 1,
      last_job_failure_at: "2026-07-20T00:00:00.000Z",
      activity_events_30d: 42,
      onboarding_completion_percent: 80,
      adopted_feature_count: 5,
      available_feature_count: 7,
      feature_adoption_percent: 71,
      health_rank: 1,
    });

    expect(health).toMatchObject({
      lastLoginAt: "2026-07-27T00:00:00.000Z",
      onboardingCompletionPercent: 80,
      jobFailures30d: 1,
      featureAdoptionPercent: 71,
      activityEvents30d: 42,
    });
    expect(health).not.toHaveProperty("documents");
    expect(health).not.toHaveProperty("riskEvidence");
  });
});
