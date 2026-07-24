export type PortfolioObservationType =
  | "documentation_gap"
  | "vendor_concentration"
  | "recurring_risk"
  | "overdue_actions";

export type ObservationEvidence = Readonly<{
  label: string;
  value: string;
  entityType: "project" | "risk" | "vendor" | "action" | "document";
  entityId: string;
}>;

export type PortfolioObservation = Readonly<{
  key: string;
  type: PortfolioObservationType;
  title: string;
  summary: string;
  supportingEvidence: readonly ObservationEvidence[];
  confidence: number;
  affectedProjectIds: readonly string[];
  affectedProjects: readonly Readonly<{ id: string; name: string }>[];
  businessImpactEstimateCents: number | null;
  businessImpactExplanation: string;
  recommendedNextStep: string;
  algorithmVersion: string;
}>;

export type RiskRelationshipType =
  | "duplicate"
  | "caused_by"
  | "contributes_to"
  | "blocks"
  | "same_vendor"
  | "same_subcontractor"
  | "same_document"
  | "same_project_phase"
  | "same_root_cause";

export type RiskRelationship = Readonly<{
  sourceRiskId: string;
  targetRiskId: string;
  type: RiskRelationshipType;
  confidence: number;
  supportingEvidence: readonly ObservationEvidence[];
  algorithmVersion: string;
}>;

export type HistoricalRiskMatch = Readonly<{
  riskId: string;
  projectId: string | null;
  projectName: string;
  title: string;
  summary: string;
  detectedAt: string;
  resolvedAt: string;
  resolutionSummary: string;
  resolutionType: string;
  timeToResolutionHours: number;
  estimatedExposureCents: number;
  remainingExposureCents: number;
  estimatedLossAvoidedCents: number | null;
  outcome: string;
  similarityScore: number;
  matchReasons: readonly string[];
}>;
