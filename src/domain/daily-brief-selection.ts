import type { Risk, RiskSeverity } from "@/domain/types";

const FEATURED_RISK_COUNT = 3;

const severityRank: Readonly<Record<RiskSeverity, number>> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function isRiskEligibleForBrief(risk: Risk): boolean {
  return risk.status !== "resolved" && risk.status !== "dismissed";
}

export function compareBriefPriority(left: Risk, right: Risk): number {
  return (
    severityRank[right.severity] - severityRank[left.severity] ||
    right.estimatedMarginImpactCents - left.estimatedMarginImpactCents ||
    right.potentialExposureCents - left.potentialExposureCents ||
    right.confidenceScore - left.confidenceScore ||
    new Date(right.detectedAt).getTime() -
      new Date(left.detectedAt).getTime() ||
    left.id.localeCompare(right.id)
  );
}

export function selectDailyBriefRisks(risks: readonly Risk[]): readonly Risk[] {
  return risks
    .filter(isRiskEligibleForBrief)
    .toSorted(compareBriefPriority)
    .slice(0, FEATURED_RISK_COUNT);
}

export function canPublishDailyBrief(riskIds: readonly string[]): boolean {
  return (
    riskIds.length === FEATURED_RISK_COUNT &&
    new Set(riskIds).size === FEATURED_RISK_COUNT
  );
}
