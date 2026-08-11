"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ShieldAlert,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  calculateScenario,
  type ScenarioKind,
} from "@/features/forecasting/scenario";
import type { ForecastingView } from "@/features/forecasting/types";
import { formatMoney, formatPercent } from "@/features/reports/format";

export function ForecastWorkspace({ view }: { view: ForecastingView }) {
  return (
    <div className="mx-auto max-w-[96rem] space-y-6 px-[var(--page-gutter)] py-6 sm:py-8">
      <header className="rounded-2xl bg-[#f4f7ed] px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-deep-green text-xs font-semibold tracking-[0.12em] uppercase">
              Deterministic lookahead
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Forecasting
            </h1>
            <p className="text-muted mt-3 max-w-2xl text-sm leading-6 sm:text-base">
              See where budget, margin, cash, schedule signals, and commitments
              may need attention. Estimates are labeled and every scenario is
              temporary.
            </p>
          </div>
          <div className="border-border bg-surface rounded-xl border px-4 py-3 text-sm">
            <p className="text-muted text-xs">Forecast generated</p>
            <p className="mt-1 font-semibold">
              {formatDateTime(view.generatedAt)}
            </p>
          </div>
        </div>
      </header>

      <ForecastSummary view={view} />

      <section aria-labelledby="project-outlook-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-deep-green text-xs font-semibold tracking-[0.1em] uppercase">
              Needs attention
            </p>
            <h2
              id="project-outlook-heading"
              className="mt-1 text-xl font-semibold"
            >
              Project outlook
            </h2>
            <p className="text-muted mt-1 text-sm">
              Ranked by unfavorable budget position and active schedule-risk
              severity.
            </p>
          </div>
          <Link
            href="/projects"
            className="text-deep-green text-sm font-semibold"
          >
            View projects <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ProjectOutlook view={view} />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <CashOutlook view={view} />
        <ForecastReadiness view={view} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <RiskOutlook view={view} />
        <CommitmentOutlook view={view} />
      </div>

      {view.canViewFinancials && view.projects.length ? (
        <ScenarioPanel view={view} />
      ) : null}
    </div>
  );
}

function ForecastSummary({ view }: { view: ForecastingView }) {
  if (!view.canViewFinancials || !view.portfolio) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 size-5 text-amber-800"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-semibold">Financial outlook is restricted</h2>
            <p className="mt-1 text-sm leading-6 text-amber-900/80">
              You can review schedule-risk signals and upcoming commitments, but
              financial forecasts are hidden for your role.
            </p>
          </div>
        </div>
      </Card>
    );
  }
  const metrics = [
    {
      label: "Net budget outlook",
      value: formatMoney(view.portfolio.budgetVarianceCents, view.currencyCode),
      detail:
        view.portfolio.budgetVarianceCents === null
          ? "Insufficient financial inputs"
          : view.portfolio.budgetVarianceCents < 0
            ? "Projected over budget"
            : "Projected budget buffer",
      danger:
        view.portfolio.budgetVarianceCents !== null &&
        view.portfolio.budgetVarianceCents < 0,
    },
    {
      label: "Forecast margin",
      value: formatPercent(view.portfolio.forecastMarginPercent),
      detail: `${view.portfolio.projectsOverBudget} projects currently over budget`,
      danger: false,
    },
    {
      label: "30-day net cash",
      value: formatMoney(
        view.cash?.day30.buckets[0]?.netCashFlow.valueCents ?? null,
        view.currencyCode,
      ),
      detail: confidenceLabel(view.cash?.day30.confidence ?? "unavailable"),
      danger: (view.cash?.day30.buckets[0]?.netCashFlow.valueCents ?? 0) < 0,
    },
    {
      label: "Forecast confidence",
      value: humanize(view.readiness.confidence),
      detail:
        view.readiness.missingInputs.length > 0
          ? `${view.readiness.missingInputs.length} input gaps identified`
          : "Required inputs are available",
      danger: view.readiness.confidence === "low",
    },
  ];
  return (
    <section
      aria-label="Forecast summary"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-5">
          <p className="text-muted text-sm">{metric.label}</p>
          <p
            className={`mt-3 text-2xl font-semibold ${metric.danger ? "text-danger" : ""}`}
          >
            {metric.value}
          </p>
          <p className="text-muted mt-2 text-xs leading-5">{metric.detail}</p>
        </Card>
      ))}
    </section>
  );
}

function ProjectOutlook({ view }: { view: ForecastingView }) {
  if (!view.projects.length)
    return (
      <Card>
        <p className="text-muted text-sm">No active projects are available.</p>
      </Card>
    );
  return (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {view.projects.slice(0, 6).map((project) => {
        const needsAttention =
          (project.budgetVarianceCents !== null &&
            project.budgetVarianceCents < 0) ||
          ["critical", "high"].includes(project.highestScheduleSeverity ?? "");
        return (
          <Card key={project.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">{project.name}</h3>
                <p className="text-muted mt-1 text-xs capitalize">
                  {needsAttention
                    ? "Attention recommended"
                    : "No critical signal"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${needsAttention ? "bg-soft-red text-danger" : "bg-soft-green text-deep-green"}`}
              >
                {needsAttention ? "Watch" : "Stable"}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="Budget variance"
                value={
                  view.canViewFinancials
                    ? formatMoney(
                        project.budgetVarianceCents,
                        project.currencyCode,
                      )
                    : "Restricted"
                }
              />
              <Metric
                label="Forecast margin"
                value={
                  view.canViewFinancials
                    ? formatPercent(project.forecastMarginPercent)
                    : "Restricted"
                }
              />
              <Metric
                label="Schedule risks"
                value={`${project.scheduleRiskCount}`}
              />
              <Metric
                label="Target finish"
                value={
                  project.targetCompletionDate
                    ? formatDate(project.targetCompletionDate)
                    : "Missing"
                }
              />
            </dl>
            <Link
              href={`/projects/${project.id}`}
              className="text-deep-green mt-4 inline-flex items-center gap-1 text-sm font-semibold"
            >
              Open project{" "}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </Card>
        );
      })}
    </div>
  );
}

function CashOutlook({ view }: { view: ForecastingView }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="bg-soft-green text-deep-green grid size-10 place-items-center rounded-lg">
          <CircleDollarSign className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">
            30 / 60 / 90-day cash outlook
          </h2>
          <p className="text-muted mt-1 text-sm">
            Expected inflows and outflows from dated events, with estimated cost
            distribution used only when needed.
          </p>
        </div>
      </div>
      {view.cash ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "30 days", forecast: view.cash.day30 },
            { label: "60 days", forecast: view.cash.day60 },
            { label: "90 days", forecast: view.cash.day90 },
          ].map(({ label, forecast }) => {
            const bucket = forecast.buckets[0];
            return (
              <div key={label} className="border-border rounded-lg border p-4">
                <p className="text-muted text-xs font-semibold uppercase">
                  {label}
                </p>
                <p
                  className={`mt-2 text-xl font-semibold ${(bucket?.netCashFlow.valueCents ?? 0) < 0 ? "text-danger" : ""}`}
                >
                  {formatMoney(
                    bucket?.netCashFlow.valueCents ?? null,
                    view.currencyCode,
                  )}
                </p>
                <p className="text-muted mt-2 text-xs">
                  In{" "}
                  {formatMoney(
                    bucket?.expectedInflows.valueCents ?? null,
                    view.currencyCode,
                  )}{" "}
                  · Out{" "}
                  {formatMoney(
                    bucket?.expectedOutflows.valueCents ?? null,
                    view.currencyCode,
                  )}
                </p>
                <p className="text-muted mt-2 text-xs capitalize">
                  {forecast.confidence} confidence
                  {bucket?.isEstimated ? " · includes estimates" : ""}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted mt-5 text-sm">
          Cash-flow values are restricted for your role.
        </p>
      )}
    </Card>
  );
}

function ForecastReadiness({ view }: { view: ForecastingView }) {
  const gaps = view.readiness.missingInputs.map(humanize);
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-deep-green text-xs font-semibold tracking-[0.1em] uppercase">
            Data readiness
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            Can this forecast be trusted?
          </h2>
        </div>
        <span className="bg-background rounded-full px-3 py-1 text-xs font-semibold capitalize">
          {view.readiness.confidence}
        </span>
      </div>
      <ul className="mt-5 space-y-3 text-sm">
        <ReadinessRow
          ok={view.readiness.projectsMissingFinancialData === 0}
          text={
            view.readiness.projectsMissingFinancialData
              ? `${view.readiness.projectsMissingFinancialData} projects lack complete financial inputs`
              : "Project financial inputs are complete"
          }
        />
        <ReadinessRow
          ok={view.readiness.projectsWithoutCompletionDate === 0}
          text={
            view.readiness.projectsWithoutCompletionDate
              ? `${view.readiness.projectsWithoutCompletionDate} projects lack a target completion date`
              : "Target completion dates are available"
          }
        />
        <ReadinessRow
          ok={gaps.length === 0}
          text={
            gaps.length
              ? `Missing: ${gaps.slice(0, 3).join(", ")}`
              : "No calculation-level gaps detected"
          }
        />
      </ul>
      <p className="text-muted mt-5 border-t pt-4 text-xs leading-5">
        Confidence reflects source completeness and whether Sightline had to
        distribute undated remaining costs as estimates.
      </p>
      {view.canViewFinancials ? (
        <Link
          href="/forecasts/readiness"
          className="text-deep-green mt-4 inline-flex items-center gap-2 text-sm font-semibold"
        >
          Open data-readiness center
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </Card>
  );
}

function RiskOutlook({ view }: { view: ForecastingView }) {
  return (
    <Card className="min-w-0">
      <div className="flex items-start gap-3">
        <TrendingDown
          className="text-danger mt-0.5 size-5"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-lg font-semibold">Risks most likely to worsen</h2>
          <p className="text-muted mt-1 text-sm">
            {view.worseningDrivers.length
              ? "Risks within categories trending worse than the prior snapshot."
              : "Trend history is limited, so these are the highest-attention active signals."}
          </p>
        </div>
      </div>
      {view.worseningRisks.length ? (
        <ol className="mt-5 min-w-0 divide-y">
          {view.worseningRisks.map((risk, index) => (
            <li key={risk.id}>
              <Link
                href={risk.href}
                className="flex min-w-0 items-center gap-3 py-3"
              >
                <span className="bg-soft-red text-danger grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {risk.title}
                  </span>
                  <span className="text-muted mt-0.5 block text-xs capitalize">
                    {risk.category} · {risk.severity} · attention{" "}
                    {risk.attentionScore}
                  </span>
                </span>
                <ArrowRight
                  className="text-muted size-4 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted mt-5 text-sm">
          No active risks require forecasting attention.
        </p>
      )}
    </Card>
  );
}

function CommitmentOutlook({ view }: { view: ForecastingView }) {
  return (
    <Card className="min-w-0">
      <div className="flex items-start gap-3">
        <CalendarClock
          className="text-deep-green mt-0.5 size-5"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-lg font-semibold">
            Upcoming deadlines and commitments
          </h2>
          <p className="text-muted mt-1 text-sm">
            Open actions due within the next 90 days, including overdue work.
          </p>
        </div>
      </div>
      {view.commitments.length ? (
        <ul className="mt-5 divide-y">
          {view.commitments.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start justify-between gap-3 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="text-muted mt-1 block text-xs">
                    {item.projectName ?? "Portfolio"} ·{" "}
                    {item.ownerName ?? "Unassigned"}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-xs font-semibold ${new Date(item.dueAt) < new Date(view.generatedAt) ? "text-danger" : "text-muted"}`}
                >
                  {formatDate(item.dueAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted mt-5 text-sm">
          No open commitments are due in the next 90 days.
        </p>
      )}
    </Card>
  );
}

function ScenarioPanel({ view }: { view: ForecastingView }) {
  const [projectId, setProjectId] = useState(view.projects[0]!.id);
  const [kind, setKind] = useState<ScenarioKind>(
    "reject_pending_change_orders",
  );
  const [costIncrease, setCostIncrease] = useState(10);
  const project =
    view.projects.find((item) => item.id === projectId) ?? view.projects[0]!;
  const result = useMemo(
    () => calculateScenario(project, kind, costIncrease),
    [project, kind, costIncrease],
  );
  return (
    <section aria-labelledby="scenario-heading">
      <Card className="overflow-hidden p-0">
        <div className="bg-[#f4f7ed] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <SlidersHorizontal
              className="text-deep-green mt-0.5 size-5"
              aria-hidden="true"
            />
            <div>
              <p className="text-deep-green text-xs font-semibold tracking-[0.1em] uppercase">
                Temporary scenario
              </p>
              <h2 id="scenario-heading" className="mt-1 text-xl font-semibold">
                What changes if…
              </h2>
              <p className="text-muted mt-1 text-sm">
                Explore one explicit assumption at a time. Nothing here updates
                project records.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">
            <label className="block text-sm font-semibold">
              Project
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="border-border mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal"
              >
                {view.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Assumption
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as ScenarioKind)
                }
                className="border-border mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal"
              >
                <option value="reject_pending_change_orders">
                  Pending change orders are rejected
                </option>
                <option value="cost_to_complete_increase">
                  Remaining cost increases
                </option>
                <option value="completion_delay">
                  Completion moves four weeks later
                </option>
              </select>
            </label>
            {kind === "cost_to_complete_increase" ? (
              <label className="block text-sm font-semibold">
                Cost increase
                <select
                  value={costIncrease}
                  onChange={(event) =>
                    setCostIncrease(Number(event.target.value))
                  }
                  className="border-border mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal"
                >
                  {[5, 10, 15, 20].map((value) => (
                    <option key={value} value={value}>
                      {value}%
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div
            className="border-border rounded-xl border p-5"
            aria-live="polite"
          >
            <p className="text-muted text-xs font-semibold uppercase">
              Scenario result
            </p>
            <h3 className="mt-2 text-lg font-semibold">{result.title}</h3>
            <p className="text-muted mt-2 text-sm leading-6">
              {result.description}
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <Metric
                label="Current variance"
                value={formatMoney(
                  project.budgetVarianceCents,
                  project.currencyCode,
                )}
              />
              <Metric
                label="Scenario variance"
                value={formatMoney(
                  result.adjustedVarianceCents,
                  project.currencyCode,
                )}
              />
              <Metric
                label="Variance change"
                value={formatMoney(
                  result.varianceChangeCents,
                  project.currencyCode,
                )}
              />
              <Metric
                label="Scenario completion"
                value={
                  result.adjustedCompletionDate
                    ? formatDate(result.adjustedCompletionDate)
                    : "Not available"
                }
              />
            </dl>
            <p className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {result.caveat}
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function ReadinessRow({ ok, text }: { ok: boolean; text: string }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <li className="flex items-start gap-2">
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${ok ? "text-deep-green" : "text-amber-700"}`}
        aria-hidden="true"
      />
      <span>{text}</span>
    </li>
  );
}

function confidenceLabel(value: string) {
  return `${humanize(value)} confidence`;
}
function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
