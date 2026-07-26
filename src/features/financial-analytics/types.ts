export type FinancialDataQuality =
  "complete" | "partial" | "estimated" | "missing" | "unavailable";

export type CalculationMetadata = Readonly<{
  calculationVersion: string;
  calculatedAt: string;
  sourceData: readonly string[];
  derived: boolean;
  missingInputs: readonly string[];
}>;

export type MoneyMetric = Readonly<{
  valueCents: number | null;
  quality: FinancialDataQuality;
  metadata: CalculationMetadata;
}>;

export type ProjectFinancialInput = Readonly<{
  projectId: string;
  projectName: string;
  status: string;
  currencyCode: string | null;
  contractValueCents: number | null;
  projectedMarginCents: number | null;
  startDate: string | null;
  targetCompletionDate: string | null;
  originalBudgetCents: number | null;
  committedCostCents: number | null;
  actualCostCents: number | null;
  forecastCostToCompleteCents: number | null;
  dataAsOfDate: string | null;
  changeOrders: readonly Readonly<{
    id: string;
    status: "approved" | "pending" | "rejected";
    amountCents: number;
  }>[];
}>;

export type ProjectFinancialMetrics = Readonly<{
  projectId: string;
  projectName: string;
  currencyCode: string | null;
  quality: FinancialDataQuality;
  contractValue: MoneyMetric;
  projectedMargin: MoneyMetric;
  forecastMarginPercent: number | null;
  originalBudget: MoneyMetric;
  approvedBudget: MoneyMetric;
  revisedBudget: MoneyMetric;
  committedCosts: MoneyMetric;
  actualCosts: MoneyMetric;
  approvedChangeOrders: MoneyMetric;
  pendingChangeOrders: MoneyMetric;
  forecastCostToComplete: MoneyMetric;
  estimateAtCompletion: MoneyMetric;
  remainingBudget: MoneyMetric;
  budgetVariance: MoneyMetric;
  budgetVariancePercent: number | null;
  varianceDirection: "under_budget" | "over_budget" | "on_budget" | "unknown";
}>;

export type PortfolioFinancialMetrics = Readonly<{
  currencyCode: string | null;
  quality: FinancialDataQuality;
  totalPortfolioBudget: MoneyMetric;
  totalForecastCost: MoneyMetric;
  totalRemainingBudget: MoneyMetric;
  netBudgetVariance: MoneyMetric;
  budgetVariancePercent: number | null;
  forecastMarginPercent: number | null;
  activeProjects: number;
  projectsOverBudget: number;
  projectsUnderBudget: number;
  projectsOnBudget: number;
  projectsMissingFinancialData: number;
  projects: readonly ProjectFinancialMetrics[];
  metadata: CalculationMetadata;
}>;

export type ForecastPeriod =
  "weekly" | "monthly" | "rolling_30_days" | "rolling_90_days";
export type ForecastConfidence = "high" | "medium" | "low" | "unavailable";

export type CashFlowEventInput = Readonly<{
  id: string;
  projectId: string;
  projectName: string;
  direction: "inflow" | "outflow";
  amountCents: number;
  expectedDate: string;
  sourceType:
    "payment_schedule" | "invoice" | "commitment" | "forecast" | "manual";
  confidence: "high" | "medium" | "low";
}>;

export type CashFlowBucket = Readonly<{
  startsOn: string;
  endsOn: string;
  expectedInflows: MoneyMetric;
  expectedOutflows: MoneyMetric;
  netCashFlow: MoneyMetric;
  confidence: ForecastConfidence;
  isEstimated: boolean;
}>;

export type CashFlowForecast = Readonly<{
  period: ForecastPeriod;
  currencyCode: string | null;
  confidence: ForecastConfidence;
  buckets: readonly CashFlowBucket[];
  projectsDrivingCashUsage: readonly Readonly<{
    projectId: string;
    projectName: string;
    amountCents: number;
  }>[];
  projectsDrivingIncomingRevenue: readonly Readonly<{
    projectId: string;
    projectName: string;
    amountCents: number;
  }>[];
  metadata: CalculationMetadata;
}>;

export type FinancialComparison = Readonly<{
  currentValue: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  direction: "improved" | "deteriorated" | "unchanged" | "unavailable";
}>;

export type PortfolioFinancialComparison = Readonly<{
  currentMonth: string;
  previousMonth: string | null;
  netBudgetVariance: FinancialComparison;
  portfolioBudget: FinancialComparison;
  forecastCost: FinancialComparison;
  projectsImproved: readonly string[];
  projectsDeteriorated: readonly string[];
  newProjects: readonly string[];
  completedProjects: readonly string[];
  quality: FinancialDataQuality;
}>;
