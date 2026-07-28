import { describe, expect, it } from "vitest";

import { evaluateFeatureFlag, stableRolloutBucket } from "./evaluate";
import type { FeatureFlag } from "./types";

const flag: FeatureFlag = {
  id: "1",
  key: "ask-sightline-v3",
  name: "Ask Sightline",
  description: "",
  enabled: true,
  defaultEnabled: false,
  environments: [],
  organizationIds: [],
  userIds: [],
  rolloutPercentage: 100,
  createdAt: "",
  updatedAt: "",
};

describe("centralized feature flag evaluation", () => {
  it("evaluates known global flags and safely defaults unknown flags", () => {
    expect(
      evaluateFeatureFlag(flag, { environment: "production" }).enabled,
    ).toBe(true);
    expect(
      evaluateFeatureFlag(null, {
        environment: "production",
        fallback: false,
      }),
    ).toEqual({ enabled: false, reason: "unknown_flag" });
  });

  it("never enables a disabled flag", () => {
    expect(
      evaluateFeatureFlag(
        { ...flag, enabled: false, defaultEnabled: true },
        { environment: "production" },
      ),
    ).toEqual({ enabled: false, reason: "disabled" });
  });

  it("applies environment restrictions before targeting", () => {
    expect(
      evaluateFeatureFlag(
        {
          ...flag,
          environments: ["preview"],
          organizationIds: ["org-1"],
        },
        { environment: "production", organizationId: "org-1" },
      ).reason,
    ).toBe("environment_mismatch");
  });

  it("applies organization and user targeting in order", () => {
    expect(
      evaluateFeatureFlag(
        { ...flag, organizationIds: ["org-1"], rolloutPercentage: 0 },
        { environment: "production", organizationId: "org-1" },
      ).reason,
    ).toBe("organization_target");
    expect(
      evaluateFeatureFlag(
        { ...flag, userIds: ["user-1"], rolloutPercentage: 0 },
        { environment: "production", userId: "user-1" },
      ).reason,
    ).toBe("user_target");
  });

  it("keeps percentage assignment stable for the same subject", () => {
    const subject = `${flag.key}:organization`;
    const first = stableRolloutBucket(subject);
    expect(stableRolloutBucket(subject)).toBe(first);
    const result = evaluateFeatureFlag(
      { ...flag, rolloutPercentage: first + 1 },
      { environment: "production", organizationId: "organization" },
    );
    expect(result).toMatchObject({
      enabled: true,
      reason: "percentage_rollout",
      bucket: first,
    });
  });
});
