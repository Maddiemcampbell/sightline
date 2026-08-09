import {
  ArrowDownToLine,
  ArrowRight,
  CircleDollarSign,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { RiskBadge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getReportsData } from "@/features/reports/data";
import {
  formatInteger,
  formatMoney,
  formatPercent,
  formatReportDate,
} from "@/features/reports/format";

export default async function ReportsPage() {
  const { financialAnalytics, riskAnalytics } = await getReportsData();
  const currency = financialAnalytics?.portfolio.currencyCode ?? null;
  const leadingRisks = riskAnalytics.executiveRisks.slice(0, 8);
  const leadingDrivers = riskAnalytics.drivers.slice(0, 6);
  const projectFinancials = financialAnalytics
    ? [...financialAnalytics.portfolio.projects]
        .sort((a, b) => {
          if (a.varianceDirection === b.varianceDirection)
            return a.projectName.localeCompare(b.projectName);
          return a.varianceDirection === "over_budget" ? -1 : 1;
        })
        .slice(0, 8)
    : [];

  return (
    <div className="mx-auto max-w-[90rem] space-y-8 px-[var(--page-gutter)] py-8 sm:py-10">
      <PageHeader
        eyebrow="Reporting workspace"
        title="Portfolio reports"
        description="Move from portfolio signals to an executive-ready view, then download a permission-aware PDF for review or distribution."
        actions={
          <Link
            href="/api/reports/risk"
            className="bg-deep-green hover:bg-ink inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            <ArrowDownToLine className="size-4" aria-hidden="true" />
            Download risk PDF
          </Link>
        }
      />

      <section aria-labelledby="portfolio-overview">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="portfolio-overview" className="text-xl font-semibold">
              Portfolio overview
            </h2>
            <p className="text-muted mt-1 text-sm">
              Current position across the projects you are authorized to view.
            </p>
          </div>
          <p className="text-muted text-xs">
            Calculated {formatReportDate(riskAnalytics.metadata.calculatedAt)}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active risks"
            value={formatInteger(riskAnalytics.summary.activeRisks)}
            detail={`${riskAnalytics.summary.affectedProjects} affected projects`}
          />
          <MetricCard
            label="High / critical risks"
            value={formatInteger(riskAnalytics.summary.highCriticalRisks)}
            detail={`${riskAnalytics.metadata.quality} risk data quality`}
          />
          {financialAnalytics ? (
            <>
              <MetricCard
                label="Portfolio budget"
                value={formatMoney(
                  financialAnalytics.portfolio.totalPortfolioBudget.valueCents,
                  currency,
                )}
                detail={`${financialAnalytics.portfolio.activeProjects} active projects`}
              />
              <MetricCard
                label="Net budget variance"
                value={formatMoney(
                  financialAnalytics.portfolio.netBudgetVariance.valueCents,
                  currency,
                )}
                detail={`${financialAnalytics.portfolio.projectsOverBudget} projects over budget`}
                trend={
                  financialAnalytics.portfolio.netBudgetVariance.valueCents !==
                    null &&
                  financialAnalytics.portfolio.netBudgetVariance.valueCents <
                    0 ? (
                    <TrendingDown
                      className="text-danger size-5"
                      aria-label="Unfavorable variance"
                    />
                  ) : (
                    <TrendingUp
                      className="text-deep-green size-5"
                      aria-label="Favorable variance"
                    />
                  )
                }
              />
            </>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-soft-red text-danger grid size-9 place-items-center rounded-md">
                  <ShieldAlert className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold">
                  Executive attention queue
                </h2>
              </div>
              <p className="text-muted mt-3 text-sm">
                Highest-ranked active risks based on severity, exposure,
                ownership, evidence, and overdue actions.
              </p>
            </div>
            <StatusBadge status={qualityStatus(riskAnalytics.metadata.quality)}>
              {riskAnalytics.metadata.quality} data
            </StatusBadge>
          </div>
          {leadingRisks.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead className="bg-background text-muted border-border border-y text-xs">
                  <tr>
                    <th className="px-5 py-3 font-semibold sm:px-6">Risk</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 text-right font-semibold sm:px-6">
                      Attention
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leadingRisks.map((risk) => (
                    <tr
                      key={risk.riskId}
                      className="border-border border-b last:border-0"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <a
                          href={risk.href}
                          className="hover:text-deep-green font-semibold"
                        >
                          {risk.title}
                        </a>
                        <p className="text-muted mt-1 max-w-lg text-xs">
                          {risk.reasons.slice(0, 2).join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <RiskBadge level={severityLevel(risk.severity)}>
                          {humanize(risk.severity)}
                        </RiskBadge>
                      </td>
                      <td className="text-muted px-4 py-4 capitalize">
                        {humanize(risk.category)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold sm:px-6">
                        {risk.attentionScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted border-border border-t p-6 text-sm">
              No active risks currently require executive attention.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Risk concentration</h2>
          <p className="text-muted mt-1 text-sm">
            Categories driving the current portfolio position.
          </p>
          <ol className="mt-5 space-y-5">
            {leadingDrivers.map((driver, index) => {
              const width = Math.max(
                4,
                Math.min(100, driver.percentOfActiveRisks),
              );
              return (
                <li key={driver.category}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold">
                      {index + 1}. {driver.label}
                    </span>
                    <span className="text-muted">
                      {driver.activeRiskCount} active
                    </span>
                  </div>
                  <div className="bg-background mt-2 h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-deep-green h-full rounded-full"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="text-muted mt-2 text-xs">
                    {driver.highCriticalCount} high/critical ·{" "}
                    {driver.affectedProjectCount} projects ·{" "}
                    {driver.overdueActionCount} overdue actions
                  </p>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      {financialAnalytics ? (
        <section aria-labelledby="financial-performance" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-md">
                  <CircleDollarSign className="size-4" aria-hidden="true" />
                </span>
                <h2
                  id="financial-performance"
                  className="text-xl font-semibold"
                >
                  Financial performance
                </h2>
              </div>
              <p className="text-muted mt-2 text-sm">
                Budget position and forecast outlook for your authorized
                portfolio.
              </p>
            </div>
            <Link
              href="/api/reports/financial"
              className="border-border bg-surface hover:bg-background inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors"
            >
              <ArrowDownToLine className="size-4" aria-hidden="true" />
              Download financial PDF
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Forecast cost"
              value={formatMoney(
                financialAnalytics.portfolio.totalForecastCost.valueCents,
                currency,
              )}
              detail={`${financialAnalytics.cashFlow.confidence} forecast confidence`}
            />
            <MetricCard
              label="Remaining budget"
              value={formatMoney(
                financialAnalytics.portfolio.totalRemainingBudget.valueCents,
                currency,
              )}
              detail={`${formatPercent(financialAnalytics.portfolio.budgetVariancePercent)} variance`}
            />
            <MetricCard
              label="Forecast margin"
              value={formatPercent(
                financialAnalytics.portfolio.forecastMarginPercent,
              )}
              detail={`${financialAnalytics.portfolio.quality} financial data`}
            />
            <MetricCard
              label="Missing financials"
              value={formatInteger(
                financialAnalytics.portfolio.projectsMissingFinancialData,
              )}
              detail="Projects requiring data completion"
            />
          </div>
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
              <div>
                <h3 className="font-semibold">Project budget position</h3>
                <p className="text-muted mt-1 text-sm">
                  Over-budget projects are surfaced first.
                </p>
              </div>
              <StatusBadge
                status={qualityStatus(financialAnalytics.portfolio.quality)}
              >
                {financialAnalytics.portfolio.quality} data
              </StatusBadge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="bg-background text-muted border-border border-y text-xs">
                  <tr>
                    <th className="px-5 py-3 font-semibold sm:px-6">Project</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Budget
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Forecast
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Variance
                    </th>
                    <th className="px-5 py-3 text-right font-semibold sm:px-6">
                      Position
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectFinancials.map((project) => (
                    <tr
                      key={project.projectId}
                      className="border-border border-b last:border-0"
                    >
                      <td className="px-5 py-4 font-semibold sm:px-6">
                        {project.projectName}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {formatMoney(
                          project.revisedBudget.valueCents,
                          project.currencyCode,
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {formatMoney(
                          project.estimateAtCompletion.valueCents,
                          project.currencyCode,
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatMoney(
                          project.budgetVariance.valueCents,
                          project.currencyCode,
                        )}
                      </td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <StatusBadge
                          status={varianceStatus(project.varianceDirection)}
                        >
                          {humanize(project.varianceDirection)}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      ) : null}

      <Card className="bg-deep-green border-deep-green text-white">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">About these reports</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">
              Every dashboard view and PDF is generated from live authorized
              data. Downloads include calculation timestamps, data quality,
              methodology, and limitations so recipients can interpret the
              numbers responsibly.
            </p>
          </div>
          <a
            href="/settings/privacy"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-white"
          >
            Data and privacy{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </Card>
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function severityLevel(value: string): "high" | "medium" | "low" {
  if (value === "critical" || value === "high") return "high";
  if (value === "medium") return "medium";
  return "low";
}

function qualityStatus(value: string): "complete" | "pending" | "neutral" {
  if (value === "complete") return "complete";
  if (value === "partial" || value === "estimated") return "pending";
  return "neutral";
}

function varianceStatus(value: string): "active" | "pending" | "neutral" {
  if (value === "under_budget" || value === "on_budget") return "active";
  if (value === "over_budget") return "pending";
  return "neutral";
}
