import { CircleDollarSign, ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getReportsData } from "@/features/reports/data";
import { buildAvailableReportCards } from "@/features/reports/presentation";

export default async function ReportsPage() {
  const { financialAnalytics, riskAnalytics } = await getReportsData();
  const reports = buildAvailableReportCards({
    risk: {
      activeRisks: riskAnalytics.summary.activeRisks,
      highCriticalRisks: riskAnalytics.summary.highCriticalRisks,
      quality: riskAnalytics.metadata.quality,
    },
    financial: financialAnalytics
      ? {
          projectsOverBudget: financialAnalytics.portfolio.projectsOverBudget,
          projectsMissingFinancialData:
            financialAnalytics.portfolio.projectsMissingFinancialData,
          forecastConfidence: financialAnalytics.cashFlow.confidence,
        }
      : null,
  });
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-deep-green text-sm font-semibold">
          Reporting workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Reports
        </h1>
        <p className="text-muted mt-2 max-w-2xl leading-6">
          {financialAnalytics
            ? "Review current risk and financial performance across the projects you are authorized to access."
            : "Review current risk performance across the projects you are authorized to access."}
        </p>
      </header>
      <section
        aria-label="Available report definitions"
        className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {reports.map(({ kind, title, description, summary }) => {
          const Icon = kind === "financial" ? CircleDollarSign : ShieldAlert;
          return (
            <Card key={title} className="flex min-h-52 flex-col">
              <span className="bg-soft-green text-deep-green grid size-10 place-items-center rounded-md">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="text-muted mt-2 flex-1 text-sm leading-6">
                {description}
              </p>
              <span className="text-muted border-border mt-5 border-t pt-4 text-xs font-semibold">
                {summary}
              </span>
            </Card>
          );
        })}
      </section>
      <section
        className="border-border bg-surface mt-6 rounded-xl border p-6"
        aria-labelledby="risk-driver-report"
      >
        <h2 id="risk-driver-report" className="text-lg font-semibold">
          Authoritative risk drivers
        </h2>
        <p className="text-muted mt-1 text-sm">
          Ranked with {riskAnalytics.metadata.calculationVersion}. Historical
          trend is unavailable until the first monthly snapshot is captured.
        </p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {riskAnalytics.drivers.slice(0, 6).map((driver) => (
            <li
              key={driver.category}
              className="border-border rounded-lg border p-4"
            >
              <p className="font-semibold">{driver.label}</p>
              <p className="text-muted mt-1 text-sm">
                {driver.activeRiskCount} active · {driver.highCriticalCount}{" "}
                high/critical · {driver.affectedProjectCount} projects
              </p>
              <p className="text-muted mt-2 text-xs">
                {driver.rankReasons.join(" · ")}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
