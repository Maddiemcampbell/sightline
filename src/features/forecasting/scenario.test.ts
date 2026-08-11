import { describe, expect, it } from "vitest";

import { calculateScenario } from "@/features/forecasting/scenario";
import type { ForecastProject } from "@/features/forecasting/types";

const project: ForecastProject = {
  id: "project-1",
  name: "Cedar Grove",
  currencyCode: "USD",
  quality: "complete",
  budgetVarianceCents: 1_000_000,
  budgetVariancePercent: 2,
  forecastMarginPercent: 8,
  estimateAtCompletionCents: 50_000_000,
  forecastCostToCompleteCents: 20_000_000,
  pendingChangeOrdersCents: 250_000,
  targetCompletionDate: "2026-09-30",
  scheduleRiskCount: 1,
  highestScheduleSeverity: "high",
};

describe("calculateScenario", () => {
  it("models rejected pending recovery without changing source values", () => {
    expect(
      calculateScenario(project, "reject_pending_change_orders"),
    ).toMatchObject({
      adjustedVarianceCents: 750_000,
      varianceChangeCents: -250_000,
    });
  });

  it("applies a deterministic remaining-cost sensitivity", () => {
    expect(
      calculateScenario(project, "cost_to_complete_increase", 10),
    ).toMatchObject({
      adjustedVarianceCents: -1_000_000,
      varianceChangeCents: -2_000_000,
    });
  });

  it("moves the completion date without inventing a cost impact", () => {
    expect(calculateScenario(project, "completion_delay")).toMatchObject({
      adjustedCompletionDate: "2026-10-28",
      varianceChangeCents: 0,
    });
  });
});
