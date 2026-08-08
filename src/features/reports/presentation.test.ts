import { describe, expect, it } from "vitest";

import { buildAvailableReportCards } from "./presentation";

describe("available report cards", () => {
  it("presents only reports backed by live analytics", () => {
    const cards = buildAvailableReportCards({
      risk: { activeRisks: 14, highCriticalRisks: 4, quality: "complete" },
      financial: {
        projectsOverBudget: 2,
        projectsMissingFinancialData: 1,
        forecastConfidence: "high",
      },
    });

    expect(cards.map((card) => card.title)).toEqual([
      "Risk Trends",
      "Financial Performance",
    ]);
    expect(cards.map((card) => card.summary)).toEqual([
      "14 active · 4 high/critical · complete data",
      "2 over budget · 1 missing financial data · high forecast confidence",
    ]);
    expect(JSON.stringify(cards)).not.toMatch(
      /coming later|foundation|will live/i,
    );
  });

  it("omits financial reporting when financial analytics are unauthorized", () => {
    const cards = buildAvailableReportCards({
      risk: { activeRisks: 3, highCriticalRisks: 1, quality: "partial" },
      financial: null,
    });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ kind: "risk", title: "Risk Trends" });
  });
});
