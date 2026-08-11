import { describe, expect, it } from "vitest";

import { calculateProjectReadiness } from "./calculate";

const complete = {
  id: "project-1",
  name: "Cedar Grove",
  targetCompletionDate: "2027-01-01",
  forecastMarginPercent: 12,
  originalBudgetCents: 1_000_000,
  committedCostCents: 600_000,
  actualCostCents: 400_000,
  forecastCostToCompleteCents: 400_000,
  dataAsOfDate: "2026-08-10",
  hasDatedCashEvents: true,
  connectedSources: ["Procore"],
} as const;

describe("calculateProjectReadiness", () => {
  it("reports high confidence for complete and fresh authoritative inputs", () => {
    const result = calculateProjectReadiness(
      complete,
      new Date("2026-08-11T12:00:00Z"),
      14,
    );
    expect(result).toMatchObject({
      score: 100,
      confidence: "high",
      authoritativeValues: 6,
      missingInputs: [],
      estimatedValues: [],
    });
  });

  it("reduces confidence and recommends repairs for stale incomplete data", () => {
    const result = calculateProjectReadiness(
      {
        ...complete,
        actualCostCents: null,
        targetCompletionDate: null,
        dataAsOfDate: "2026-07-01",
        hasDatedCashEvents: false,
      },
      new Date("2026-08-11T12:00:00Z"),
      14,
    );
    expect(result.confidence).toBe("low");
    expect(result.missingInputs).toEqual([
      "Actual cost",
      "Target completion date",
    ]);
    expect(result.estimatedValues).toHaveLength(1);
    expect(result.recommendations.map((item) => item.label)).toEqual([
      "Complete project inputs",
      "Refresh financial data",
      "Add dated cash events",
    ]);
  });
});
