import type {
  CalculationMetadata,
  CashFlowBucket,
  CashFlowEventInput,
  CashFlowForecast,
  ForecastConfidence,
  ForecastPeriod,
  MoneyMetric,
  ProjectFinancialInput,
} from "@/features/financial-analytics/types";
import { FINANCIAL_CALCULATION_VERSION } from "@/features/financial-analytics/calculations";

const DAY_MS = 86_400_000;

type ForecastEvent = CashFlowEventInput & { estimated: boolean };

export class ForecastService {
  generate({
    projects,
    cashEvents,
    period = "monthly",
    now = new Date(),
  }: {
    projects: readonly ProjectFinancialInput[];
    cashEvents: readonly CashFlowEventInput[];
    period?: ForecastPeriod;
    now?: Date;
  }): CashFlowForecast {
    const ranges = buildRanges(period, now);
    const explicitProjectIds = new Set(
      cashEvents
        .filter((event) => event.direction === "outflow")
        .map((event) => event.projectId),
    );
    const fallbackEvents = projects.flatMap((project) =>
      explicitProjectIds.has(project.projectId)
        ? []
        : distributeRemainingCost(project, ranges, now),
    );
    const events: ForecastEvent[] = [
      ...cashEvents.map((event) => ({ ...event, estimated: false })),
      ...fallbackEvents,
    ];
    const buckets = ranges.map((range): CashFlowBucket => {
      const matching = events.filter(
        (event) =>
          event.expectedDate >= range.startsOn &&
          event.expectedDate <= range.endsOn,
      );
      const inflows = matching.filter((event) => event.direction === "inflow");
      const outflows = matching.filter(
        (event) => event.direction === "outflow",
      );
      const inflowCents = sumSafe(inflows.map((event) => event.amountCents));
      const outflowCents = sumSafe(outflows.map((event) => event.amountCents));
      const confidence = confidenceFor(matching);
      const metadata = forecastMetadata(matching, now);
      const money = (valueCents: number): MoneyMetric => ({
        valueCents,
        quality: matching.some((event) => event.estimated)
          ? "estimated"
          : matching.length
            ? "complete"
            : "missing",
        metadata,
      });
      return {
        ...range,
        expectedInflows: money(inflowCents),
        expectedOutflows: money(outflowCents),
        netCashFlow: money(inflowCents - outflowCents),
        confidence,
        isEstimated: matching.some((event) => event.estimated),
      };
    });
    const projectTotals = (direction: "inflow" | "outflow") =>
      [...new Set(events.map((event) => event.projectId))]
        .map((projectId) => {
          const matching = events.filter(
            (event) =>
              event.projectId === projectId &&
              event.direction === direction &&
              ranges.some(
                (range) =>
                  event.expectedDate >= range.startsOn &&
                  event.expectedDate <= range.endsOn,
              ),
          );
          return {
            projectId,
            projectName: matching[0]?.projectName ?? "Unknown project",
            amountCents: sumSafe(matching.map((event) => event.amountCents)),
          };
        })
        .filter((item) => item.amountCents > 0)
        .sort((a, b) => b.amountCents - a.amountCents)
        .slice(0, 5);
    return {
      period,
      currencyCode: commonCurrency(projects),
      confidence: confidenceFor(events),
      buckets,
      projectsDrivingCashUsage: projectTotals("outflow"),
      projectsDrivingIncomingRevenue: projectTotals("inflow"),
      metadata: forecastMetadata(events, now),
    };
  }
}

function buildRanges(
  period: ForecastPeriod,
  now: Date,
): readonly Readonly<{ startsOn: string; endsOn: string }>[] {
  const date = utcDate(now);
  if (period === "rolling_30_days" || period === "rolling_90_days") {
    const days = period === "rolling_30_days" ? 30 : 90;
    return [{ startsOn: iso(date), endsOn: iso(addDays(date, days - 1)) }];
  }
  if (period === "weekly") {
    return Array.from({ length: 13 }, (_, index) => {
      const starts = addDays(date, index * 7);
      return { startsOn: iso(starts), endsOn: iso(addDays(starts, 6)) };
    });
  }
  return Array.from({ length: 6 }, (_, index) => {
    const starts = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + index, 1),
    );
    const ends = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + index + 1, 0),
    );
    return { startsOn: iso(starts), endsOn: iso(ends) };
  });
}

function distributeRemainingCost(
  project: ProjectFinancialInput,
  ranges: readonly Readonly<{ startsOn: string; endsOn: string }>[],
  now: Date,
): ForecastEvent[] {
  const amount = project.forecastCostToCompleteCents;
  if (amount === null || amount <= 0 || !ranges.length) return [];
  const completion = project.targetCompletionDate;
  const eligible = ranges.filter(
    (range) => !completion || range.startsOn <= completion,
  );
  if (!eligible.length) return [];
  const total = BigInt(amount);
  const count = BigInt(eligible.length);
  const base = total / count;
  const remainder = total % count;
  return eligible.map((range, index) => ({
    id: `estimated:${project.projectId}:${range.startsOn}`,
    projectId: project.projectId,
    projectName: project.projectName,
    direction: "outflow",
    amountCents: Number(
      base + (BigInt(index) < remainder ? BigInt(1) : BigInt(0)),
    ),
    expectedDate:
      range.startsOn < iso(utcDate(now)) ? iso(utcDate(now)) : range.startsOn,
    sourceType: "forecast",
    confidence: "low",
    estimated: true,
  }));
}

function forecastMetadata(
  events: readonly ForecastEvent[],
  now: Date,
): CalculationMetadata {
  return {
    calculationVersion: FINANCIAL_CALCULATION_VERSION,
    calculatedAt: now.toISOString(),
    sourceData: events.map((event) =>
      event.estimated
        ? `estimated_distribution:${event.projectId}`
        : `financial_cash_events:${event.id}`,
    ),
    derived: true,
    missingInputs: events.length ? [] : ["scheduled_cash_events"],
  };
}

function confidenceFor(events: readonly ForecastEvent[]): ForecastConfidence {
  if (!events.length) return "unavailable";
  if (events.some((event) => event.estimated || event.confidence === "low"))
    return "low";
  if (events.some((event) => event.confidence === "medium")) return "medium";
  return "high";
}

function commonCurrency(projects: readonly ProjectFinancialInput[]) {
  const currencies = [
    ...new Set(
      projects.flatMap((project) =>
        project.currencyCode ? [project.currencyCode] : [],
      ),
    ),
  ];
  return currencies.length === 1 ? currencies[0]! : null;
}

function sumSafe(values: readonly number[]) {
  const total = values.reduce((sum, value) => sum + BigInt(value), BigInt(0));
  const number = Number(total);
  if (!Number.isSafeInteger(number))
    throw new Error("Forecast amount exceeds safe integer cents.");
  return number;
}

function utcDate(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}
function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_MS);
}
function iso(value: Date) {
  return value.toISOString().slice(0, 10);
}
