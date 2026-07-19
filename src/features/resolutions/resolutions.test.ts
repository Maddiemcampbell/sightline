import { describe, expect, it } from "vitest";

import {
  calculateResolutionValueSummary,
  reopenRiskSchema,
  resolveRiskSchema,
} from "@/domain/resolutions";
import { assertSameOrganization } from "@/lib/auth/authorization";

const validResolution = {
  riskId: "60000000-0000-4000-8000-000000000002",
  summary:
    "The pour moved to a protected window and the crew reservation was retained.",
  resolutionType: "mitigated",
  finalOwnerUserId: "11000000-0000-4000-8000-000000000001",
  resolvedDate: "2026-07-19",
  completedActionIds: ["80000000-0000-4000-8000-000000000002"],
  exposureBeforeCents: 18_600_000,
  remainingExposureCents: 2_000_000,
  estimatedLossAvoidedCents: 8_400_000,
  warningUseful: true,
  predictionAccurate: true,
  internalNotes: null,
} as const;

describe("risk resolution", () => {
  it("requires the complete guided resolution record", () => {
    expect(resolveRiskSchema.parse(validResolution)).toMatchObject({
      resolutionType: "mitigated",
      warningUseful: true,
    });
    expect(() =>
      resolveRiskSchema.parse({ ...validResolution, summary: "Too short" }),
    ).toThrow();
    expect(() =>
      resolveRiskSchema.parse({
        ...validResolution,
        remainingExposureCents: validResolution.exposureBeforeCents + 1,
      }),
    ).toThrow(/cannot exceed/i);
  });

  it("calculates estimated value without overstating negative reductions", () => {
    expect(
      calculateResolutionValueSummary([
        {
          exposureBeforeCents: 10_000_000,
          remainingExposureCents: 2_500_000,
          estimatedLossAvoidedCents: 4_000_000,
          detectedAt: "2026-07-18T12:00:00.000Z",
          resolvedAt: "2026-07-19T12:00:00.000Z",
        },
        {
          exposureBeforeCents: 1_000_000,
          remainingExposureCents: 1_500_000,
          estimatedLossAvoidedCents: 0,
          detectedAt: "2026-07-18T12:00:00.000Z",
          resolvedAt: "2026-07-20T12:00:00.000Z",
        },
      ]),
    ).toEqual({
      risksResolved: 2,
      estimatedExposureReducedCents: 7_500_000,
      estimatedLossAvoidedCents: 4_000_000,
      averageResolutionHours: 36,
    });
  });

  it("requires a substantive reopening reason", () => {
    expect(() =>
      reopenRiskSchema.parse({
        riskId: validResolution.riskId,
        reason: "Again",
      }),
    ).toThrow();
    expect(
      reopenRiskSchema.parse({
        riskId: validResolution.riskId,
        reason: "New evidence shows the exposure remains active.",
      }),
    ).toMatchObject({ riskId: validResolution.riskId });
  });

  it("enforces the organization authorization boundary", () => {
    expect(() =>
      assertSameOrganization(
        { organizationId: "10000000-0000-4000-8000-000000000001" },
        "10000000-0000-4000-8000-000000000002",
      ),
    ).toThrow(/not found/i);
  });
});
