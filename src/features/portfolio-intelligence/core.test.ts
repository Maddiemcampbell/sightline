import { describe, expect, it } from "vitest";

import {
  deriveHomepageIntelligence,
  derivePortfolioObservations,
  deriveRiskRelationships,
  findHistoricalRiskMatches,
} from "@/features/portfolio-intelligence/core";

const projects = [
  { id: "p1", name: "Atlas", status: "active" },
  { id: "p2", name: "Beacon", status: "active" },
];

function risk(
  id: string,
  overrides: Partial<{
    project_id: string | null;
    vendor_id: string | null;
    detection_key: string | null;
    category: string;
    title: string;
    summary: string;
    status: string;
    detected_at: string;
    resolved_at: string | null;
    potential_exposure_cents: number;
  }> = {},
) {
  return {
    id,
    project_id: "p1",
    vendor_id: null,
    detection_key: null,
    category: "documentation",
    title: `Risk ${id}`,
    summary: `Summary ${id}`,
    status: "open",
    detected_at: "2026-03-01T00:00:00.000Z",
    resolved_at: null,
    potential_exposure_cents: 100_00,
    ...overrides,
  };
}

describe("deterministic portfolio intelligence", () => {
  it("reports document coverage gaps with traceable evidence and exposure", () => {
    const observations = derivePortfolioObservations({
      projects,
      risks: [risk("r1"), risk("r2", { project_id: "p2" })],
      actions: [],
      documents: [],
      vendors: [],
      now: new Date("2026-04-01T00:00:00.000Z"),
    });

    expect(observations[0]).toMatchObject({
      type: "documentation_gap",
      confidence: 100,
      affectedProjectIds: ["p1", "p2"],
      businessImpactEstimateCents: 200_00,
    });
    expect(observations[0]?.supportingEvidence).toHaveLength(2);
  });

  it("calculates vendor concentration from unresolved vendor-linked risks", () => {
    const observations = derivePortfolioObservations({
      projects,
      risks: [
        risk("r1", { vendor_id: "v1" }),
        risk("r2", { vendor_id: "v1", project_id: "p2" }),
        risk("r3", { vendor_id: "v2" }),
        risk("r4", { vendor_id: "v3", project_id: "p2" }),
      ],
      actions: [],
      documents: [
        { id: "d1", project_id: "p1", archived_at: null },
        { id: "d2", project_id: "p2", archived_at: null },
      ],
      vendors: [
        { id: "v1", name: "Apex" },
        { id: "v2", name: "BuildCo" },
        { id: "v3", name: "Core" },
      ],
      now: new Date("2026-04-01T00:00:00.000Z"),
    });

    expect(
      observations.find((item) => item.type === "vendor_concentration"),
    ).toMatchObject({
      title: "Two vendors account for 75% of vendor-linked unresolved risks",
      confidence: 100,
      businessImpactEstimateCents: 300_00,
    });
  });

  it("connects only exact supported attributes and never guesses causality", () => {
    const relationships = deriveRiskRelationships(
      [
        risk("r1", { detection_key: "missing-insurance", vendor_id: "v1" }),
        risk("r2", { detection_key: "missing-insurance", vendor_id: "v1" }),
      ],
      [
        { risk_id: "r1", document_id: "d1" },
        { risk_id: "r2", document_id: "d1" },
      ],
    );

    expect(relationships.map((item) => item.type).toSorted()).toEqual([
      "duplicate",
      "same_document",
      "same_vendor",
    ]);
    expect(relationships.every((item) => item.confidence === 100)).toBe(true);
    expect(relationships.some((item) => item.type === "caused_by")).toBe(false);
  });

  it("returns explainable resolved-history matches with outcomes", () => {
    const matches = findHistoricalRiskMatches({
      current: risk("current", {
        title: "Apex insurance certificate is missing",
        vendor_id: "v1",
        detection_key: "missing-insurance",
      }),
      resolvedRisks: [
        risk("historical", {
          title: "Apex insurance certificate expired",
          vendor_id: "v1",
          detection_key: "missing-insurance",
          status: "resolved",
        }),
      ],
      resolutions: [
        {
          risk_id: "historical",
          summary: "A replacement certificate was verified.",
          resolution_type: "mitigated",
          resolved_at: "2026-03-03T00:00:00.000Z",
          exposure_before_cents: 50_000_00,
          remaining_exposure_cents: 0,
          estimated_loss_avoided_cents: 40_000_00,
          warning_useful: true,
          prediction_accurate: true,
          reopened_at: null,
        },
      ],
      projects,
    });

    expect(matches[0]).toMatchObject({
      riskId: "historical",
      projectName: "Atlas",
      resolutionSummary: "A replacement certificate was verified.",
      timeToResolutionHours: 48,
      estimatedExposureCents: 50_000_00,
      similarityScore: 100,
    });
    expect(matches[0]?.matchReasons).toContain(
      "same deterministic detection pattern",
    );
  });

  it("creates a root-cause hypothesis only when two strong observations overlap", () => {
    const risks = [
      risk("r1"),
      risk("r2", { project_id: "p2" }),
      risk("r3", { project_id: "p2" }),
    ];
    const observations = derivePortfolioObservations({
      projects,
      risks,
      actions: [],
      documents: [],
      vendors: [],
      now: new Date("2026-04-01T00:00:00.000Z"),
    });
    const intelligence = deriveHomepageIntelligence({
      observations,
      risks,
      resolutions: [],
      projects,
      now: new Date("2026-04-01T00:00:00.000Z"),
    });

    expect(intelligence.rootCauseSuggestions[0]).toMatchObject({
      title: "Possible root cause: incomplete document coverage",
      confidence: 80,
    });
    expect(
      intelligence.rootCauseSuggestions[0]?.supportingObservations,
    ).toHaveLength(2);
    expect(
      intelligence.rootCauseSuggestions[0]?.recommendedInvestigationSteps[0],
    ).toContain("Confirm");
  });

  it("does not speculate from a single observation", () => {
    const observations = derivePortfolioObservations({
      projects,
      risks: [],
      actions: [],
      documents: [],
      vendors: [],
      now: new Date("2026-04-01T00:00:00.000Z"),
    });
    const intelligence = deriveHomepageIntelligence({
      observations,
      risks: [],
      resolutions: [],
      projects,
      now: new Date("2026-04-01T00:00:00.000Z"),
    });

    expect(intelligence.rootCauseSuggestions).toEqual([]);
  });
});
