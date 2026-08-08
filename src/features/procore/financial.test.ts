import { describe, expect, it } from "vitest";

import { calculateProcoreFinancialSignals } from "./financial";

describe("Procore financial signals", () => {
  it("calculates deterministic projected overrun and commitment exposure", () => {
    const signals = calculateProcoreFinancialSignals({
      budgetCents: 1_000_000,
      committedCents: 1_100_000,
      directCostCents: 950_000,
      forecastCents: 1_250_000,
      contractValueCents: 1_300_000,
      completeness: "complete",
    });
    expect(signals).toEqual([
      expect.objectContaining({
        signalType: "projected_cost_overrun",
        exposureCents: 250_000,
        confidenceScore: 95,
      }),
      expect.objectContaining({
        signalType: "commitment_exposure",
        exposureCents: 100_000,
        confidenceScore: 90,
      }),
      expect.objectContaining({
        signalType: "margin_erosion",
        exposureCents: 250_000,
      }),
    ]);
  });

  it("does not invent an overrun when financially required values are missing", () => {
    expect(
      calculateProcoreFinancialSignals({
        budgetCents: null,
        committedCents: 100,
        directCostCents: 100,
        forecastCents: null,
        contractValueCents: null,
        completeness: "unavailable",
      }),
    ).toEqual([]);
  });
});
