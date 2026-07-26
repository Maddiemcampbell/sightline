import type { HeatmapCell } from "@/features/risk-analytics/types";

const DAY_MS = 86_400_000;

export function projectScopeLabel(
  projectName: string | null,
  accessibleProjectCount: number,
) {
  return projectName ?? `All accessible projects (${accessibleProjectCount})`;
}

export function formatDueUrgency(
  dueAt: string | null,
  referenceAt: string,
) {
  if (!dueAt) return "Due date unavailable";
  const delta = Date.parse(referenceAt) - Date.parse(dueAt);
  const days = Math.floor(Math.abs(delta) / DAY_MS);
  if (Math.abs(delta) < DAY_MS) return delta > 0 ? "Due today · overdue" : "Due today";
  if (delta > 0) return `${Math.max(1, days)} day${days === 1 ? "" : "s"} overdue`;
  return `Due in ${Math.max(1, days)} day${days === 1 ? "" : "s"}`;
}

export function heatmapCellLabel(
  projectName: string,
  categoryLabel: string,
  cell: HeatmapCell,
) {
  if (!cell.activeRiskCount)
    return `${projectName}, ${categoryLabel}: no active risks; data unavailable.`;
  return [
    `${projectName}, ${categoryLabel}`,
    `${cell.activeRiskCount} active risk${cell.activeRiskCount === 1 ? "" : "s"}`,
    `highest severity ${cell.highestSeverity ?? "unavailable"}`,
    `${cell.overdueActionCount} overdue mitigation action${cell.overdueActionCount === 1 ? "" : "s"}`,
    `trend ${cell.trendState}`,
    `data ${cell.quality.replaceAll("_", " ")}`,
  ].join("; ");
}

export function riskStatusLabel(level: "high" | "medium" | "low") {
  return level === "high"
    ? "High priority"
    : level === "medium"
      ? "Medium priority"
      : "Low priority";
}

export function formatCompactCurrency(cents: number) {
  const absolute = Math.abs(cents) / 100;
  const sign = cents < 0 ? "−" : "";
  if (absolute >= 1_000_000_000)
    return `${sign}$${(absolute / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000)
    return `${sign}$${(absolute / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000)
    return `${sign}$${Math.round(absolute / 1_000)}K`;
  return `${sign}$${Math.round(absolute)}`;
}
