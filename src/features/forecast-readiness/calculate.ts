import type { ForecastConfidence } from "@/features/financial-analytics/types";
import type {
  ProjectReadiness,
  ProjectReadinessInput,
} from "@/features/forecast-readiness/types";

const DAY_MS = 86_400_000;

const fields = [
  ["Forecast margin", "forecastMarginPercent"],
  ["Original budget", "originalBudgetCents"],
  ["Committed cost", "committedCostCents"],
  ["Actual cost", "actualCostCents"],
  ["Forecast cost to complete", "forecastCostToCompleteCents"],
  ["Target completion date", "targetCompletionDate"],
] as const;

export function calculateProjectReadiness(
  input: ProjectReadinessInput,
  now: Date,
  staleAfterDays: number,
): ProjectReadiness {
  const missingInputs = fields
    .filter(([, key]) => input[key] === null)
    .map(([label]) => label);
  const authoritativeValues = fields.length - missingInputs.length;
  const staleDays = input.dataAsOfDate
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - dateAtEndOfDay(input.dataAsOfDate).getTime()) /
            DAY_MS,
        ),
      )
    : null;
  const stale = staleDays === null || staleDays > staleAfterDays;
  const estimatedValues =
    !input.hasDatedCashEvents && input.forecastCostToCompleteCents
      ? ["Undated remaining costs are distributed across the forecast window"]
      : [];
  const completenessScore = Math.round(
    (authoritativeValues / fields.length) * 100,
  );
  const score = Math.max(
    0,
    completenessScore -
      (stale ? (staleDays === null ? 15 : 20) : 0) -
      (estimatedValues.length ? 10 : 0),
  );
  const confidence = confidenceFor(score, authoritativeValues);
  const recommendations: ProjectReadiness["recommendations"] = [
    ...(missingInputs.length
      ? [
          {
            label: "Complete project inputs",
            detail: `Add ${missingInputs.slice(0, 3).join(", ")}${missingInputs.length > 3 ? ` and ${missingInputs.length - 3} more` : ""}.`,
            href: `/projects/${input.id}`,
          },
        ]
      : []),
    ...(stale
      ? [
          {
            label: "Refresh financial data",
            detail:
              staleDays === null
                ? "Record an as-of date so Sightline can verify freshness."
                : `Inputs are ${staleDays} days old; refresh data newer than ${staleAfterDays} days.`,
            href: input.connectedSources.length
              ? "/integrations"
              : `/projects/${input.id}`,
          },
        ]
      : []),
    ...(estimatedValues.length
      ? [
          {
            label: "Add dated cash events",
            detail:
              "Replace distributed cost estimates with dated commitments, invoices, or payment schedules.",
            href: "/forecasts",
          },
        ]
      : []),
  ];
  return {
    id: input.id,
    name: input.name,
    score,
    confidence,
    dataAsOfDate: input.dataAsOfDate,
    staleDays,
    authoritativeValues,
    expectedValues: fields.length,
    estimatedValues,
    missingInputs,
    connectedSources: input.connectedSources,
    recommendations,
  };
}

export function confidenceFor(
  score: number,
  authoritativeValues: number,
): ForecastConfidence {
  if (authoritativeValues === 0) return "unavailable";
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function dateAtEndOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}
