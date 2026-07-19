import { describe, expect, it } from "vitest";

import {
  createRiskActivitySchema,
  createRiskSchema,
  updateRiskSchema,
} from "@/domain/validation";

const validRisk = {
  organizationId: "10000000-0000-4000-8000-000000000001",
  projectId: null,
  vendorId: null,
  title: "Subcontractor insurance is expiring",
  summary: "The policy expires while active work remains.",
  category: "insurance" as const,
  severity: "high" as const,
  status: "action_needed" as const,
  potentialExposureCents: 32500000,
  estimatedMarginImpactCents: 12500000,
  confidenceScore: 94,
  whyItMatters:
    "Uninsured work can transfer loss exposure to the general contractor.",
  detectedAt: "2026-07-18T12:00:00Z",
  dueAt: "2026-07-25T17:00:00Z",
  resolvedAt: null,
};

describe("risk validation", () => {
  it("accepts integer cents and a bounded confidence percentage", () => {
    const result = createRiskSchema.parse(validRisk);

    expect(result.potentialExposureCents).toBe(32500000);
    expect(result.confidenceScore).toBe(94);
  });

  it("rejects fractional money and confidence above 100", () => {
    const result = createRiskSchema.safeParse({
      ...validRisk,
      potentialExposureCents: 125.5,
      confidenceScore: 101,
    });

    expect(result.success).toBe(false);
  });

  it("requires a resolution timestamp for a resolved risk", () => {
    const result = createRiskSchema.safeParse({
      ...validRisk,
      status: "resolved",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty updates", () => {
    expect(updateRiskSchema.safeParse({}).success).toBe(false);
  });

  it("requires distinct status values for status-change activity", () => {
    const result = createRiskActivitySchema.safeParse({
      organizationId: validRisk.organizationId,
      riskId: "60000000-0000-4000-8000-000000000001",
      activityType: "status_changed",
      fromStatus: "monitoring",
      toStatus: "monitoring",
      occurredAt: "2026-07-18T13:00:00Z",
    });

    expect(result.success).toBe(false);
  });
});
