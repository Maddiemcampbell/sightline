import type { ForecastProject } from "@/features/forecasting/types";

export type ScenarioKind =
  | "reject_pending_change_orders"
  | "cost_to_complete_increase"
  | "completion_delay";

export type ScenarioResult = Readonly<{
  title: string;
  description: string;
  adjustedVarianceCents: number | null;
  varianceChangeCents: number | null;
  adjustedCompletionDate: string | null;
  caveat: string;
}>;

export function calculateScenario(
  project: ForecastProject,
  kind: ScenarioKind,
  costIncreasePercent = 10,
): ScenarioResult {
  if (kind === "reject_pending_change_orders") {
    const impact = project.pendingChangeOrdersCents;
    return {
      title: "Pending change orders are rejected",
      description: impact
        ? "Treats pending recovery as unfunded exposure and reduces the current budget buffer by that amount."
        : "This project has no pending change-order value in Sightline.",
      adjustedVarianceCents:
        project.budgetVarianceCents === null
          ? null
          : project.budgetVarianceCents - impact,
      varianceChangeCents: impact ? -impact : 0,
      adjustedCompletionDate: project.targetCompletionDate,
      caveat:
        "This scenario does not change the approved budget or source records.",
    };
  }

  if (kind === "cost_to_complete_increase") {
    const remaining = project.forecastCostToCompleteCents;
    const impact =
      remaining === null
        ? null
        : Math.round((remaining * costIncreasePercent) / 100);
    return {
      title: `Remaining cost increases ${costIncreasePercent}%`,
      description:
        impact === null
          ? "A cost impact cannot be calculated because forecast cost to complete is missing."
          : "Adds the selected percentage to forecast cost to complete and reduces the current variance by the same amount.",
      adjustedVarianceCents:
        project.budgetVarianceCents === null || impact === null
          ? null
          : project.budgetVarianceCents - impact,
      varianceChangeCents: impact === null ? null : -impact,
      adjustedCompletionDate: project.targetCompletionDate,
      caveat:
        "This is a deterministic sensitivity test, not a probability-weighted prediction.",
    };
  }

  return {
    title: "Completion moves four weeks later",
    description: project.targetCompletionDate
      ? "Moves the target completion date forward by 28 days. Cash values remain unchanged until dated billing and commitment events are available."
      : "A schedule impact cannot be calculated because the target completion date is missing.",
    adjustedVarianceCents: project.budgetVarianceCents,
    varianceChangeCents: 0,
    adjustedCompletionDate: project.targetCompletionDate
      ? addDays(project.targetCompletionDate, 28)
      : null,
    caveat:
      "Sightline does not infer financial delay costs without an explicit assumption or source record.",
  };
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
