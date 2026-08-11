import type { ForecastConfidence } from "@/features/financial-analytics/types";

export type ProjectReadinessInput = Readonly<{
  id: string;
  name: string;
  targetCompletionDate: string | null;
  forecastMarginPercent: number | null;
  originalBudgetCents: number | null;
  committedCostCents: number | null;
  actualCostCents: number | null;
  forecastCostToCompleteCents: number | null;
  dataAsOfDate: string | null;
  hasDatedCashEvents: boolean;
  connectedSources: readonly string[];
}>;

export type ProjectReadiness = Readonly<{
  id: string;
  name: string;
  score: number;
  confidence: ForecastConfidence;
  dataAsOfDate: string | null;
  staleDays: number | null;
  authoritativeValues: number;
  expectedValues: number;
  estimatedValues: readonly string[];
  missingInputs: readonly string[];
  connectedSources: readonly string[];
  recommendations: readonly Readonly<{
    label: string;
    detail: string;
    href: string;
  }>[];
}>;

export type ForecastReadinessCenter = Readonly<{
  generatedAt: string;
  canViewFinancials: boolean;
  canManageIntegrations: boolean;
  staleAfterDays: number;
  score: number;
  confidence: ForecastConfidence;
  projects: readonly ProjectReadiness[];
  summary: Readonly<{
    readyProjects: number;
    staleProjects: number;
    projectsWithMissingInputs: number;
    authoritativeValues: number;
    estimatedValues: number;
  }>;
  integrations: readonly Readonly<{
    id: string;
    provider: string;
    name: string;
    status: string;
    lastSuccessfulSyncAt: string | null;
    stale: boolean;
  }>[];
  mapping: Readonly<{
    discoveredObjects: number;
    mappedObjects: number;
    unmappedObjects: number;
  }>;
  recommendations: readonly Readonly<{
    priority: "high" | "medium";
    title: string;
    detail: string;
    href: string;
  }>[];
}>;
