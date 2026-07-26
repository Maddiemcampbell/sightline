import type {
  CalculationMetadata,
  FinancialComparison,
  FinancialDataQuality,
  MoneyMetric,
  PortfolioFinancialMetrics,
  ProjectFinancialInput,
  ProjectFinancialMetrics,
} from "@/features/financial-analytics/types";

export const FINANCIAL_CALCULATION_VERSION = "financial-analytics-v1";

function asCents(value: number): bigint {
  if (!Number.isSafeInteger(value))
    throw new Error("Money values must be safe integer cents.");
  return BigInt(value);
}

function toSafeNumber(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result))
    throw new Error("Calculated money value exceeds safe integer cents.");
  return result;
}

export function sumMoneyCents(values: readonly number[]): number {
  return toSafeNumber(
    values.reduce((total, value) => total + asCents(value), BigInt(0)),
  );
}

function metadata({
  now,
  sources,
  derived,
  missing = [],
}: {
  now: Date;
  sources: readonly string[];
  derived: boolean;
  missing?: readonly string[];
}): CalculationMetadata {
  return {
    calculationVersion: FINANCIAL_CALCULATION_VERSION,
    calculatedAt: now.toISOString(),
    sourceData: sources,
    derived,
    missingInputs: missing,
  };
}

function metric(
  valueCents: number | null,
  quality: FinancialDataQuality,
  data: CalculationMetadata,
): MoneyMetric {
  return { valueCents, quality, metadata: data };
}

function roundedRatioBasisPoints(
  numerator: number,
  denominator: number,
): number {
  if (!denominator) return 0;
  const scaled = asCents(numerator) * BigInt(10_000);
  const divisor = asCents(denominator);
  const sign = scaled < BigInt(0) ? BigInt(-1) : BigInt(1);
  const absolute = scaled < BigInt(0) ? -scaled : scaled;
  return toSafeNumber(sign * ((absolute + divisor / BigInt(2)) / divisor));
}

export function calculateProjectFinancials(
  input: ProjectFinancialInput,
  now = new Date(),
): ProjectFinancialMetrics {
  const approvedOrders = input.changeOrders.filter(
    (order) => order.status === "approved",
  );
  const pendingOrders = input.changeOrders.filter(
    (order) => order.status === "pending",
  );
  const approvedChangeOrderCents = sumMoneyCents(
    approvedOrders.map((order) => order.amountCents),
  );
  const pendingChangeOrderCents = sumMoneyCents(
    pendingOrders.map((order) => order.amountCents),
  );
  const hasBudget = input.originalBudgetCents !== null;
  const approvedBudgetCents = hasBudget
    ? toSafeNumber(
        asCents(input.originalBudgetCents!) + asCents(approvedChangeOrderCents),
      )
    : null;
  const hasEac =
    input.actualCostCents !== null &&
    input.forecastCostToCompleteCents !== null;
  const estimateAtCompletionCents = hasEac
    ? toSafeNumber(
        asCents(input.actualCostCents!) +
          asCents(input.forecastCostToCompleteCents!),
      )
    : null;
  const remainingBudgetCents =
    approvedBudgetCents !== null && input.actualCostCents !== null
      ? toSafeNumber(
          asCents(approvedBudgetCents) - asCents(input.actualCostCents),
        )
      : null;
  const budgetVarianceCents =
    approvedBudgetCents !== null && estimateAtCompletionCents !== null
      ? toSafeNumber(
          asCents(approvedBudgetCents) - asCents(estimateAtCompletionCents),
        )
      : null;
  const missing = [
    input.originalBudgetCents === null ? "original_budget_cents" : null,
    input.committedCostCents === null ? "committed_cost_cents" : null,
    input.actualCostCents === null ? "actual_cost_cents" : null,
    input.forecastCostToCompleteCents === null
      ? "forecast_cost_to_complete_cents"
      : null,
  ].filter((value): value is string => value !== null);
  const quality: FinancialDataQuality =
    missing.length === 4 ? "missing" : missing.length ? "partial" : "complete";
  const direct = (source: string, value: number | null) =>
    metric(
      value,
      value === null ? "missing" : "complete",
      metadata({
        now,
        sources: [`project_financials.${source}`],
        derived: false,
        missing: value === null ? [source] : [],
      }),
    );
  const derived = (
    value: number | null,
    sources: readonly string[],
    missingInputs: readonly string[],
    estimated = false,
  ) =>
    metric(
      value,
      value === null ? "unavailable" : estimated ? "estimated" : quality,
      metadata({ now, sources, derived: true, missing: missingInputs }),
    );

  return {
    projectId: input.projectId,
    projectName: input.projectName,
    currencyCode: input.currencyCode,
    quality,
    contractValue: metric(
      input.contractValueCents,
      input.contractValueCents === null ? "missing" : "complete",
      metadata({
        now,
        sources: ["projects.contract_value_cents"],
        derived: false,
        missing:
          input.contractValueCents === null ? ["contract_value_cents"] : [],
      }),
    ),
    projectedMargin: metric(
      input.projectedMarginCents,
      input.projectedMarginCents === null ? "missing" : "complete",
      metadata({
        now,
        sources: ["projects.projected_margin_cents"],
        derived: false,
        missing:
          input.projectedMarginCents === null ? ["projected_margin_cents"] : [],
      }),
    ),
    forecastMarginPercent:
      input.projectedMarginCents !== null && input.contractValueCents
        ? roundedRatioBasisPoints(
            input.projectedMarginCents,
            input.contractValueCents,
          ) / 100
        : null,
    originalBudget: direct("original_budget_cents", input.originalBudgetCents),
    approvedBudget: derived(
      approvedBudgetCents,
      [
        "project_financials.original_budget_cents",
        "financial_change_orders.amount_cents[approved]",
      ],
      hasBudget ? [] : ["original_budget_cents"],
    ),
    revisedBudget: derived(
      approvedBudgetCents,
      [
        "project_financials.original_budget_cents",
        "financial_change_orders.amount_cents[approved]",
      ],
      hasBudget ? [] : ["original_budget_cents"],
    ),
    committedCosts: direct("committed_cost_cents", input.committedCostCents),
    actualCosts: direct("actual_cost_cents", input.actualCostCents),
    approvedChangeOrders: metric(
      approvedChangeOrderCents,
      "complete",
      metadata({
        now,
        sources: approvedOrders.map(
          (order) => `financial_change_orders:${order.id}`,
        ),
        derived: true,
      }),
    ),
    pendingChangeOrders: metric(
      pendingChangeOrderCents,
      "complete",
      metadata({
        now,
        sources: pendingOrders.map(
          (order) => `financial_change_orders:${order.id}`,
        ),
        derived: true,
      }),
    ),
    forecastCostToComplete: direct(
      "forecast_cost_to_complete_cents",
      input.forecastCostToCompleteCents,
    ),
    estimateAtCompletion: derived(
      estimateAtCompletionCents,
      [
        "project_financials.actual_cost_cents",
        "project_financials.forecast_cost_to_complete_cents",
      ],
      hasEac
        ? []
        : [
            ...(input.actualCostCents === null ? ["actual_cost_cents"] : []),
            ...(input.forecastCostToCompleteCents === null
              ? ["forecast_cost_to_complete_cents"]
              : []),
          ],
      true,
    ),
    remainingBudget: derived(
      remainingBudgetCents,
      ["approved_budget_cents", "project_financials.actual_cost_cents"],
      remainingBudgetCents === null
        ? ["approved_budget_cents", "actual_cost_cents"]
        : [],
    ),
    budgetVariance: derived(
      budgetVarianceCents,
      ["approved_budget_cents", "estimate_at_completion_cents"],
      budgetVarianceCents === null
        ? ["approved_budget_cents", "estimate_at_completion_cents"]
        : [],
      true,
    ),
    budgetVariancePercent:
      budgetVarianceCents !== null && approvedBudgetCents
        ? roundedRatioBasisPoints(budgetVarianceCents, approvedBudgetCents) /
          100
        : null,
    varianceDirection:
      budgetVarianceCents === null
        ? "unknown"
        : budgetVarianceCents > 0
          ? "under_budget"
          : budgetVarianceCents < 0
            ? "over_budget"
            : "on_budget",
  };
}

export function aggregatePortfolioFinancials(
  inputs: readonly ProjectFinancialInput[],
  now = new Date(),
): PortfolioFinancialMetrics {
  const active = inputs.filter((input) => input.status === "active");
  const projects = active.map((input) =>
    calculateProjectFinancials(input, now),
  );
  const currencies = [
    ...new Set(
      projects.flatMap((project) =>
        project.currencyCode ? [project.currencyCode] : [],
      ),
    ),
  ];
  const mixedCurrency = currencies.length > 1;
  const currencyCode = currencies.length === 1 ? currencies[0]! : null;
  const completeProjects = projects.filter(
    (project) =>
      project.approvedBudget.valueCents !== null &&
      project.estimateAtCompletion.valueCents !== null,
  );
  const sumField = (
    select: (project: ProjectFinancialMetrics) => number | null,
  ) =>
    completeProjects.length && !mixedCurrency
      ? sumMoneyCents(
          completeProjects.flatMap((project) => {
            const value = select(project);
            return value === null ? [] : [value];
          }),
        )
      : null;
  const totalBudget = sumField((project) => project.approvedBudget.valueCents);
  const totalForecast = sumField(
    (project) => project.estimateAtCompletion.valueCents,
  );
  const netVariance = sumField((project) => project.budgetVariance.valueCents);
  const totalRemaining = sumField(
    (project) => project.remainingBudget.valueCents,
  );
  const projectsWithMargin = projects.filter(
    (project) =>
      project.contractValue.valueCents !== null &&
      project.projectedMargin.valueCents !== null,
  );
  const totalContractValue = sumMoneyCents(
    projectsWithMargin.map((project) => project.contractValue.valueCents!),
  );
  const totalProjectedMargin = sumMoneyCents(
    projectsWithMargin.map((project) => project.projectedMargin.valueCents!),
  );
  const missingCount = projects.length - completeProjects.length;
  const quality: FinancialDataQuality = mixedCurrency
    ? "unavailable"
    : !projects.length || !completeProjects.length
      ? "missing"
      : missingCount
        ? "partial"
        : "complete";
  const portfolioMetadata = metadata({
    now,
    sources: completeProjects.map(
      (project) => `project_financial_metrics:${project.projectId}`,
    ),
    derived: true,
    missing: [
      ...(mixedCurrency ? ["consistent_currency"] : []),
      ...projects
        .filter((project) => project.budgetVariance.valueCents === null)
        .map((project) => `project:${project.projectId}`),
    ],
  });
  const portfolioMetric = (value: number | null): MoneyMetric =>
    metric(value, value === null ? quality : quality, portfolioMetadata);
  return {
    currencyCode,
    quality,
    totalPortfolioBudget: portfolioMetric(totalBudget),
    totalForecastCost: portfolioMetric(totalForecast),
    totalRemainingBudget: portfolioMetric(totalRemaining),
    netBudgetVariance: portfolioMetric(netVariance),
    budgetVariancePercent:
      netVariance !== null && totalBudget
        ? roundedRatioBasisPoints(netVariance, totalBudget) / 100
        : null,
    forecastMarginPercent:
      !mixedCurrency && totalContractValue
        ? roundedRatioBasisPoints(totalProjectedMargin, totalContractValue) /
          100
        : null,
    activeProjects: active.length,
    projectsOverBudget: projects.filter(
      (project) => project.varianceDirection === "over_budget",
    ).length,
    projectsUnderBudget: projects.filter(
      (project) => project.varianceDirection === "under_budget",
    ).length,
    projectsOnBudget: projects.filter(
      (project) => project.varianceDirection === "on_budget",
    ).length,
    projectsMissingFinancialData: missingCount,
    projects,
    metadata: portfolioMetadata,
  };
}

export function compareFinancialValues(
  currentValue: number | null,
  previousValue: number | null,
  higherIsBetter = true,
): FinancialComparison {
  if (currentValue === null || previousValue === null)
    return {
      currentValue,
      previousValue,
      absoluteChange: null,
      percentageChange: null,
      direction: "unavailable",
    };
  const absoluteChange = toSafeNumber(
    asCents(currentValue) - asCents(previousValue),
  );
  const percentageChange =
    previousValue === 0
      ? null
      : roundedRatioBasisPoints(absoluteChange, Math.abs(previousValue)) / 100;
  return {
    currentValue,
    previousValue,
    absoluteChange,
    percentageChange,
    direction:
      absoluteChange === 0
        ? "unchanged"
        : absoluteChange > 0 === higherIsBetter
          ? "improved"
          : "deteriorated",
  };
}
