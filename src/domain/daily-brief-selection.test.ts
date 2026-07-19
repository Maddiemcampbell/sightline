import { describe, expect, it } from "vitest";

import {
  canPublishDailyBrief,
  selectDailyBriefRisks,
} from "@/domain/daily-brief-selection";
import type { Risk } from "@/domain/types";

function makeRisk(overrides: Partial<Risk> & Pick<Risk, "id">): Risk {
  const { id, ...rest } = overrides;

  return {
    id,
    organizationId: "10000000-0000-4000-8000-000000000001",
    projectId: null,
    vendorId: null,
    title: "Test risk",
    summary: "Test summary",
    category: "other",
    severity: "medium",
    status: "monitoring",
    potentialExposureCents: 100000,
    estimatedMarginImpactCents: 50000,
    confidenceScore: 80,
    whyItMatters: "Test explanation",
    detectedAt: "2026-07-18T12:00:00Z",
    dueAt: null,
    resolvedAt: null,
    createdAt: "2026-07-18T12:00:00Z",
    updatedAt: "2026-07-18T12:00:00Z",
    ...rest,
  };
}

describe("daily brief selection", () => {
  it("selects exactly three active risks when sufficient risks exist", () => {
    const selected = selectDailyBriefRisks([
      makeRisk({ id: "1", severity: "medium" }),
      makeRisk({ id: "2", severity: "critical" }),
      makeRisk({ id: "3", severity: "high" }),
      makeRisk({ id: "4", severity: "low" }),
    ]);

    expect(selected.map((risk) => risk.id)).toEqual(["2", "3", "1"]);
  });

  it("excludes resolved and dismissed risks", () => {
    const selected = selectDailyBriefRisks([
      makeRisk({
        id: "resolved",
        severity: "critical",
        status: "resolved",
        resolvedAt: "2026-07-18T13:00:00Z",
      }),
      makeRisk({ id: "dismissed", severity: "critical", status: "dismissed" }),
      makeRisk({ id: "active", severity: "high", status: "action_needed" }),
    ]);

    expect(selected.map((risk) => risk.id)).toEqual(["active"]);
  });

  it("uses margin impact, exposure, confidence, and id as deterministic tie-breakers", () => {
    const selected = selectDailyBriefRisks([
      makeRisk({
        id: "b",
        estimatedMarginImpactCents: 200000,
        confidenceScore: 90,
      }),
      makeRisk({
        id: "a",
        estimatedMarginImpactCents: 200000,
        confidenceScore: 90,
      }),
      makeRisk({ id: "c", estimatedMarginImpactCents: 300000 }),
    ]);

    expect(selected.map((risk) => risk.id)).toEqual(["c", "a", "b"]);
  });

  it("only publishes three distinct risk references", () => {
    expect(canPublishDailyBrief(["a", "b", "c"])).toBe(true);
    expect(canPublishDailyBrief(["a", "b"])).toBe(false);
    expect(canPublishDailyBrief(["a", "a", "b"])).toBe(false);
  });
});
