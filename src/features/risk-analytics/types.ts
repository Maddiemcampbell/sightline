import type {
  ProjectRow,
  RecommendedActionRow,
  RiskRow,
  VendorRow,
} from "@/lib/supabase/database-row.types";

export const RISK_ANALYTICS_VERSION = "risk-analytics/1.0";
export const RISK_TAXONOMY_VERSION = "portfolio-taxonomy/1.0";
export const RISK_RANKING_VERSION = "executive-attention/1.0";

export type NormalizedRiskCategory =
  | "financial" | "schedule" | "safety" | "compliance" | "quality"
  | "contractual" | "procurement" | "labor" | "vendor_subcontractor"
  | "documentation" | "change_orders" | "environmental" | "operational"
  | "insurance_claims" | "other";
export type DataState = "complete" | "partial" | "not_assessed" | "unavailable";
export type Severity = RiskRow["severity"];

export type AnalyticsRisk = RiskRow & Partial<{
  normalized_category_id: string | null;
  category_mapping_source: string | null;
  category_mapping_confidence: number | null;
  taxonomy_version: string | null;
  financial_exposure_assessed: boolean;
  last_assessed_at: string | null;
}>;

export type RiskAnalyticsFilters = Readonly<{
  projectIds?: readonly string[];
  projectStatuses?: readonly ProjectRow["status"][];
  categories?: readonly NormalizedRiskCategory[];
  severities?: readonly Severity[];
  statuses?: readonly RiskRow["status"][];
  ownerIds?: readonly string[];
  vendorIds?: readonly string[];
  periodStart?: string;
  periodEnd?: string;
}>;

export type RiskMapping = Readonly<{
  originalCategory: string;
  normalizedCategory: NormalizedRiskCategory;
  source: "manual" | "structured" | "exact_alias" | "unmapped";
  confidence: number;
  version: string;
}>;

export type MetricMetadata = Readonly<{
  calculatedAt: string;
  calculationVersion: string;
  taxonomyVersion: string;
  recordsIncluded: number;
  recordsExcluded: number;
  missingInputs: readonly string[];
  quality: DataState;
}>;

export type RankedRisk = Readonly<{
  riskId: string; title: string; projectId: string | null; category: NormalizedRiskCategory;
  severity: Severity; attentionScore: number; reasons: readonly string[];
  exposureCents: number | null; href: string;
}>;
export type RiskDriver = Readonly<{
  category: NormalizedRiskCategory; label: string; activeRiskCount: number;
  newRiskCount: number; closedRiskCount: number; highCriticalCount: number;
  affectedProjectCount: number; percentOfActiveRisks: number;
  assessedExposureCents: number | null; expectedExposureCents: null;
  overdueActionCount: number; unassignedCount: number; withoutEvidenceCount: number;
  averageAttentionScore: number; trendPercent: number | null;
  trendState: "improving" | "worsening" | "stable" | "unavailable";
  rankReasons: readonly string[]; contributingRiskIds: readonly string[];
  metadata: MetricMetadata;
}>;
export type HeatmapCell = Readonly<{
  projectId: string; category: NormalizedRiskCategory; activeRiskCount: number;
  highestSeverity: Severity | null; attentionScore: number | null;
  assessedExposureCents: number | null; expectedExposureCents: null;
  overdueActionCount: number; unassignedCount: number; withoutEvidenceCount: number;
  trendState: "improving" | "worsening" | "stable" | "unavailable";
  contributingRiskIds: readonly string[]; href: string; explanation: string;
  quality: DataState;
}>;
export type HeatmapRow = Readonly<{
  projectId: string; projectName: string; cells: readonly HeatmapCell[];
}>;
export type RiskAnalyticsOutput = Readonly<{
  summary: { activeRisks: number; highCriticalRisks: number; affectedProjects: number;
    assessedExposureCents: number | null; expectedExposureCents: null };
  drivers: readonly RiskDriver[];
  executiveRisks: readonly RankedRisk[];
  heatmap: readonly HeatmapRow[];
  categories: readonly { id: NormalizedRiskCategory; label: string }[];
  exclusions: readonly string[];
  metadata: MetricMetadata;
}>;

export type RiskAnalyticsInput = Readonly<{
  now: Date; projects: readonly ProjectRow[]; risks: readonly AnalyticsRisk[];
  actions: readonly RecommendedActionRow[]; evidence: readonly { risk_id: string }[];
  vendors?: readonly VendorRow[]; filters?: RiskAnalyticsFilters;
  canViewFinancials: boolean;
  priorSnapshot?: RiskAnalyticsOutput | null;
}>;
