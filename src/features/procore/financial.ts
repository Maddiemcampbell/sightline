export type ProcoreFinancialInputs = Readonly<{
  budgetCents: number | null;
  committedCents: number | null;
  directCostCents: number | null;
  forecastCents: number | null;
  contractValueCents: number | null;
  completeness: "complete" | "partial" | "unavailable";
}>;

export type ProcoreFinancialSignal = Readonly<{
  signalType:
    "projected_cost_overrun" | "commitment_exposure" | "margin_erosion";
  exposureCents: number | null;
  exposurePercent: number | null;
  completeness: ProcoreFinancialInputs["completeness"];
  confidenceScore: number;
}>;

export function calculateProcoreFinancialSignals(
  input: ProcoreFinancialInputs,
): ProcoreFinancialSignal[] {
  const signals: ProcoreFinancialSignal[] = [];
  const budget = input.budgetCents;
  const forecast = input.forecastCents;
  if (budget !== null && forecast !== null && budget > 0) {
    const exposure = Math.max(0, forecast - budget);
    signals.push({
      signalType: "projected_cost_overrun",
      exposureCents: exposure,
      exposurePercent: exposure / budget,
      completeness: input.completeness,
      confidenceScore:
        input.completeness === "complete"
          ? 95
          : input.completeness === "partial"
            ? 60
            : 0,
    });
  }
  if (budget !== null && input.committedCents !== null && budget > 0) {
    const exposure = Math.max(0, input.committedCents - budget);
    signals.push({
      signalType: "commitment_exposure",
      exposureCents: exposure,
      exposurePercent: exposure / budget,
      completeness: input.completeness,
      confidenceScore:
        input.completeness === "complete"
          ? 90
          : input.completeness === "partial"
            ? 55
            : 0,
    });
  }
  if (
    input.contractValueCents !== null &&
    input.contractValueCents > 0 &&
    forecast !== null &&
    budget !== null
  ) {
    const originalMargin = input.contractValueCents - budget;
    const currentMargin = input.contractValueCents - forecast;
    if (originalMargin >= 0 && currentMargin < originalMargin) {
      signals.push({
        signalType: "margin_erosion",
        exposureCents: originalMargin - currentMargin,
        exposurePercent:
          (originalMargin - currentMargin) / input.contractValueCents,
        completeness: input.completeness,
        confidenceScore: input.completeness === "complete" ? 90 : 50,
      });
    }
  }
  return signals;
}
