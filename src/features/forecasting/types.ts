import type {
  CashFlowForecast,
  FinancialDataQuality,
  ForecastConfidence,
} from "@/features/financial-analytics/types";

export type ForecastProject = Readonly<{
  id: string;
  name: string;
  currencyCode: string | null;
  quality: FinancialDataQuality;
  budgetVarianceCents: number | null;
  budgetVariancePercent: number | null;
  forecastMarginPercent: number | null;
  estimateAtCompletionCents: number | null;
  forecastCostToCompleteCents: number | null;
  pendingChangeOrdersCents: number;
  targetCompletionDate: string | null;
  scheduleRiskCount: number;
  highestScheduleSeverity: "critical" | "high" | "medium" | "low" | null;
}>;

export type ForecastCommitment = Readonly<{
  id: string;
  title: string;
  projectName: string | null;
  dueAt: string;
  priority: string;
  ownerName: string | null;
  href: string;
}>;

export type ForecastingView = Readonly<{
  canViewFinancials: boolean;
  generatedAt: string;
  currencyCode: string | null;
  portfolio: Readonly<{
    quality: FinancialDataQuality;
    budgetVarianceCents: number | null;
    budgetVariancePercent: number | null;
    forecastMarginPercent: number | null;
    projectsOverBudget: number;
    projectsMissingFinancialData: number;
  }> | null;
  cash: Readonly<{
    monthly: CashFlowForecast;
    day30: CashFlowForecast;
    day60: CashFlowForecast;
    day90: CashFlowForecast;
    confidence: ForecastConfidence;
  }> | null;
  projects: readonly ForecastProject[];
  worseningRisks: readonly Readonly<{
    id: string;
    projectId: string | null;
    title: string;
    category: string;
    severity: string;
    attentionScore: number;
    exposureCents: number | null;
    href: string;
  }>[];
  worseningDrivers: readonly Readonly<{
    label: string;
    trendPercent: number | null;
    activeRiskCount: number;
  }>[];
  commitments: readonly ForecastCommitment[];
  readiness: Readonly<{
    confidence: ForecastConfidence;
    missingInputs: readonly string[];
    projectsWithoutCompletionDate: number;
    projectsMissingFinancialData: number;
  }>;
}>;
