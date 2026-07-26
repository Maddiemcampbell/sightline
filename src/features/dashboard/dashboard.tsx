"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  FileQuestion,
  ListChecks,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import type {
  DashboardView,
  PortfolioRiskHeatmapRow,
  RiskDriver,
} from "@/features/dashboard/types";
import { formatMoney } from "@/features/daily-brief/formatters";
import type { PortfolioObservation } from "@/features/portfolio-intelligence/types";
import type { RiskAnalyticsOutput } from "@/features/risk-analytics/types";
import { ProjectFilter } from "@/features/workspace/project-filter";
import {
  AdvisorSelector,
  advisorModeLabels,
} from "@/features/workspace/advisor-selector";
import {
  useDashboardState,
  useWorkspaceResources,
} from "@/features/workspace/workspace-provider";
import { useSharedAsk } from "@/features/ask-sightline/shared-ask-provider";
import { getSuggestedOrganizationPrompts } from "@/features/ask-sightline/suggested-prompts";

const heatmapColumns = [
  "schedule",
  "budget",
  "resources",
  "contracts",
  "design",
] as const;

export function Dashboard({ view }: { view: DashboardView }) {
  const { selectedProjectId } = useDashboardState();
  const { projects } = useWorkspaceResources();
  const filteredView = filterDashboardView(view, selectedProjectId);
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: view.timezone,
  }).format(new Date(view.generatedAt));
  const firstName = view.currentUserName.split(" ")[0] ?? view.currentUserName;

  if (view.isEmptyOrganization)
    return (
      <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-8 lg:py-10">
        <p className="text-deep-green text-sm font-semibold">{date}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Good morning, {firstName}.
        </h1>
        <Card className="mt-8 py-14 text-center">
          <h2 className="text-xl font-semibold">Your portfolio is ready</h2>
          <p className="text-muted mx-auto mt-2 max-w-lg text-sm leading-6">
            Add a project to begin seeing organization-level risks, actions,
            evidence-backed intelligence, and portfolio performance.
          </p>
          <Link
            href="/projects"
            className="bg-deep-green mt-5 inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white"
          >
            Open projects
          </Link>
        </Card>
      </div>
    );

  const topRisk = filteredView.priorities.find(
    (priority) => priority.kind === "risk",
  );
  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--page-gutter)] py-6 lg:py-8">
      <section className="relative isolate min-h-[15.5rem] overflow-hidden rounded-2xl bg-[#f7f7f1] px-6 py-8 sm:px-8 lg:px-10">
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-[62%] lg:block">
          <Image
            src="/images/executive-home-construction.png"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 0vw"
            className="object-cover object-[55%_58%] opacity-65 mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f7f1] via-[#f7f7f1]/65 to-[#f7f7f1]/10" />
        </div>
        <div className="max-w-2xl">
          <p className="text-deep-green text-sm font-semibold">{date}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[2.75rem]">
            Good morning, {firstName}.
          </h1>
          <p className="text-muted mt-4 text-sm leading-6 sm:text-base">
            {selectedProject
              ? `Dashboard intelligence is scoped to ${selectedProject.name}.`
              : changeSummary(view)}
          </p>
          <p className="text-muted mt-1 text-sm leading-6 sm:text-base">
            Sightline found {filteredView.intelligence.portfolioWatch.length}{" "}
            portfolio signal
            {filteredView.intelligence.portfolioWatch.length === 1
              ? ""
              : "s"}{" "}
            that currently deserve executive attention.
          </p>
          <Link
            href="/brief"
            className="bg-deep-green mt-6 inline-flex min-h-11 items-center gap-3 rounded-md px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#0f3026]"
          >
            <MessageSquareText className="size-4" aria-hidden="true" />
            Open Daily Brief
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,0.8fr)]">
            <PortfolioOverview view={filteredView} />
            <RiskDrivers
              drivers={filteredView.riskDrivers}
              canViewFinancials={filteredView.canViewFinancials}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
            <RiskHeatmap
              analytics={filteredView.riskAnalytics ?? null}
              fallbackRows={filteredView.riskHeatmap}
            />
            <div className="space-y-4">
              <RecentIntelligence view={filteredView} />
              <OverdueActions view={filteredView} />
              <ExecutiveRecommendations view={filteredView} />
            </div>
          </div>
        </div>

        <PortfolioAdvisor view={filteredView} topRisk={topRisk ?? null} />
      </div>

      <QuickPaths view={filteredView} topRisk={topRisk ?? null} />
    </div>
  );
}

function PortfolioOverview({ view }: { view: DashboardView }) {
  const summary = view.portfolioSummary;
  const selectedProjectFinancial =
    view.portfolio.length === 1
      ? view.financialAnalytics?.portfolio.projects.find(
          (project) => project.projectId === view.portfolio[0]?.id,
        )
      : null;
  const budgetVariance =
    selectedProjectFinancial?.budgetVariance ??
    view.financialAnalytics?.portfolio.netBudgetVariance ??
    null;
  return (
    <section
      aria-label="Portfolio Watch"
      className="border-border bg-surface shadow-surface rounded-xl border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-deep-green text-[0.68rem] font-semibold tracking-[0.09em] uppercase">
            Portfolio Watch
          </p>
          <h2 className="mt-1 text-lg font-semibold">Portfolio overview</h2>
        </div>
        <ProjectFilter />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewMetric
          label="Active projects"
          value={String(summary.activeProjects)}
          detail={`${view.portfolio.length} visible to you`}
          icon={BriefcaseBusiness}
          tone="positive"
        />
        <OverviewMetric
          label="Projects at risk"
          value={String(summary.projectsAtRisk)}
          detail={
            summary.projectsAtRisk ? "Needs attention" : "No active risk signal"
          }
          icon={ShieldAlert}
          tone={summary.projectsAtRisk ? "warning" : "positive"}
        />
        <OverviewMetric
          label="Budget variance"
          value={
            !view.canViewFinancials
              ? "Restricted for your role"
              : budgetVariance?.valueCents === null || !budgetVariance
                ? "Not available"
                : formatMoney(budgetVariance.valueCents)
          }
          detail={
            !view.canViewFinancials
              ? "Not available for your role"
              : budgetVariance
                ? `${budgetVariance.quality} data · positive is under budget`
                : "Financial inputs are missing"
          }
          icon={CircleDollarSign}
          tone={
            budgetVariance?.valueCents !== null &&
            budgetVariance &&
            budgetVariance.valueCents < 0
              ? "warning"
              : "positive"
          }
        />
        <OverviewMetric
          label="Forecasted margin"
          value={
            !view.canViewFinancials
              ? "Restricted for your role"
              : summary.forecastMarginPercent === null
                ? "Not available"
                : `${summary.forecastMarginPercent}%`
          }
          detail="Projected active-project margin"
          icon={TrendingUp}
          tone="positive"
        />
      </div>
    </section>
  );
}

function OverviewMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ShieldAlert;
  tone: "positive" | "warning" | "neutral";
}) {
  return (
    <div className="border-border rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted text-xs font-medium">{label}</p>
        <Icon className="text-muted size-4" aria-hidden="true" />
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.035em]">{value}</p>
      <p
        className={`mt-2 text-xs ${
          tone === "warning"
            ? "text-danger"
            : tone === "positive"
              ? "text-deep-green"
              : "text-muted"
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

function RiskDrivers({
  drivers,
  canViewFinancials,
}: {
  drivers: readonly RiskDriver[];
  canViewFinancials: boolean;
}) {
  const maxCount = Math.max(1, ...drivers.map((driver) => driver.riskCount));
  return (
    <section className="border-border bg-surface shadow-surface rounded-xl border p-5">
      <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
        Top risk drivers
      </h2>
      {drivers.length ? (
        <ol className="mt-5 space-y-4">
          {drivers.map((driver) => (
            <li key={driver.category}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <Link
                  href={`/risks?category=${driver.category}`}
                  className="truncate font-medium hover:underline"
                >
                  {driver.label}
                </Link>
                <span className="text-muted shrink-0">
                  {driver.riskCount} risk
                  {driver.riskCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="bg-background h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${
                      driver.level === "high"
                        ? "bg-danger"
                        : driver.level === "medium"
                          ? "bg-[#dfb827]"
                          : "bg-[#2b9348]"
                    }`}
                    style={{
                      width: `${Math.max(12, (driver.riskCount / maxCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-muted w-12 text-right text-[0.68rem] capitalize">
                  {driver.level}
                </span>
              </div>
              {canViewFinancials && (
                <p className="text-muted mt-1.5 text-[0.68rem]">
                  {formatMoney(driver.exposureCents)} represented exposure
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted mt-5 text-sm">
          No unresolved risk drivers are visible.
        </p>
      )}
      <Link
        href="/risks"
        className="text-deep-green border-border mt-5 inline-flex w-full items-center justify-between border-t pt-4 text-xs font-semibold"
      >
        View all risks <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

function RiskHeatmap({
  analytics,
  fallbackRows,
}: {
  analytics: RiskAnalyticsOutput | null;
  fallbackRows: readonly PortfolioRiskHeatmapRow[];
}) {
  const categories = analytics?.categories ?? [];
  const rows = analytics?.heatmap ?? [];
  if (!analytics)
    return <LegacyRiskHeatmap rows={fallbackRows} />;
  return (
    <section className="border-border bg-surface shadow-surface overflow-hidden rounded-xl border p-5">
      <div>
        <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          Portfolio risk heatmap
        </h2>
        <p className="text-muted mt-1 text-xs">
          Highest active severity by project and normalized category. Select a
          cell to inspect its contributing risks.
        </p>
      </div>
      {rows.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-xs">
            <thead>
              <tr className="text-muted">
                <th className="pb-3 font-medium">Project</th>
                {categories.map((column) => (
                  <th
                    key={column.id}
                    className="px-3 pb-3 text-center font-medium capitalize"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.projectId} className="border-border border-t">
                  <th className="py-3 pr-3 font-medium">
                    <Link href={`/projects/${row.projectId}`}>{row.projectName}</Link>
                  </th>
                  {row.cells.map((cell) => (
                    <td key={cell.category} className="px-3 py-3 text-center">
                      <Link
                        href={cell.href}
                        aria-label={`${row.projectName}, ${cell.category}: ${cell.explanation}`}
                        title={cell.explanation}
                        className={`inline-flex size-7 items-center justify-center rounded-full text-[0.62rem] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          cell.highestSeverity === "critical" || cell.highestSeverity === "high"
                            ? "bg-danger"
                            : cell.highestSeverity === "medium" ? "bg-[#ef6c19]"
                            : cell.highestSeverity === "low" ? "bg-[#2b9348]"
                            : "bg-border text-muted"
                        }`}
                      >
                        {cell.activeRiskCount || "–"}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-border text-muted mt-4 flex flex-wrap gap-4 border-t pt-4 text-[0.68rem]">
            {[
              ["High", "bg-danger"],
              ["Medium", "bg-[#ef6c19]"],
              ["Low", "bg-[#2b9348]"],
              ["No signal", "bg-[#e7e9e3]"],
            ].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted mt-5 text-sm">
          No active projects are available for the heatmap.
        </p>
      )}
    </section>
  );
}

function LegacyRiskHeatmap({ rows }: { rows: readonly PortfolioRiskHeatmapRow[] }) {
  return (
    <section className="border-border bg-surface shadow-surface overflow-hidden rounded-xl border p-5">
      <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">Portfolio risk heatmap</h2>
      <p className="text-muted mt-1 text-xs">Highest unresolved severity by project and risk group.</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-xs"><tbody>
        {rows.map(row=><HeatmapRow key={row.projectId} row={row}/>)}
      </tbody></table></div>
    </section>
  );
}
function HeatmapRow({ row }: { row: PortfolioRiskHeatmapRow }) {
  return (
    <tr className="border-border border-t first:border-t-0">
      <th className="max-w-48 py-3 pr-3 font-medium">
        <Link
          href={`/projects/${row.projectId}`}
          className="hover:text-deep-green line-clamp-1"
        >
          {row.projectName}
        </Link>
      </th>
      {heatmapColumns.map((column) => {
        const severity = row.cells[column];
        return (
          <td key={column} className="px-3 py-3 text-center">
            <span
              className={`inline-block size-3 rounded-full ${
                severity === "critical" || severity === "high"
                  ? "bg-danger"
                  : severity === "medium"
                    ? "bg-[#ef6c19]"
                    : severity === "low"
                      ? "bg-[#2b9348]"
                      : "bg-border"
              }`}
              title={`${row.projectName}, ${column}: ${severity ?? "no signal"}`}
            >
              <span className="sr-only">
                {row.projectName}, {column}: {severity ?? "no signal"}
              </span>
            </span>
          </td>
        );
      })}
    </tr>
  );
}

function RecentIntelligence({ view }: { view: DashboardView }) {
  const observation = view.intelligence.portfolioWatch[0] ?? null;
  const hypothesis = view.intelligence.rootCauseSuggestions[0] ?? null;
  const historicalComparison =
    view.intelligence.historicalComparisons[0] ?? null;
  return (
    <section className="border-border bg-surface shadow-surface rounded-xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          Recent intelligence
        </h2>
        <Link href="/risks" className="text-deep-green text-xs font-semibold">
          View risks
        </Link>
      </div>
      {observation ? (
        <Insight observation={observation} />
      ) : (
        <p className="text-muted mt-4 text-sm">
          No cross-project observation meets the current evidence threshold.
        </p>
      )}
      {hypothesis && (
        <div
          id={`hypothesis-${hypothesis.key}`}
          className="border-border mt-4 scroll-mt-24 border-t pt-4"
        >
          <p className="text-warning text-[0.68rem] font-semibold uppercase">
            Hypothesis — not a conclusion
          </p>
          <p className="mt-1 text-sm font-semibold">{hypothesis.title}</p>
          <p className="text-muted mt-1 text-xs leading-5">
            {hypothesis.confidence}% confidence · Review assumptions before
            acting.
          </p>
          <details className="mt-3 text-xs">
            <summary className="text-deep-green cursor-pointer font-semibold">
              Review hypothesis evidence
            </summary>
            <div className="text-muted mt-2 space-y-2 leading-5">
              {hypothesis.evidence.slice(0, 2).map((evidence) => (
                <p key={`${evidence.entityType}:${evidence.entityId}`}>
                  {evidence.label}: {evidence.value}
                </p>
              ))}
              {hypothesis.assumptions[0] && (
                <p>Assumption: {hypothesis.assumptions[0]}</p>
              )}
              {hypothesis.recommendedInvestigationSteps[0] && (
                <p>
                  Investigate: {hypothesis.recommendedInvestigationSteps[0]}
                </p>
              )}
            </div>
          </details>
        </div>
      )}
      {historicalComparison && (
        <div className="border-border mt-4 border-t pt-4">
          <p className="text-deep-green text-[0.68rem] font-semibold uppercase">
            Similar to previous work
          </p>
          <p className="mt-1 text-sm font-semibold">
            {historicalComparison.match.projectName}:{" "}
            {historicalComparison.match.title}
          </p>
          <p className="text-muted mt-1 text-xs leading-5">
            {historicalComparison.match.outcome}
          </p>
        </div>
      )}
    </section>
  );
}

function Insight({ observation }: { observation: PortfolioObservation }) {
  const projectId = observation.affectedProjectIds[0];
  return (
    <div className="bg-soft-green/60 mt-4 rounded-lg p-4">
      <div className="flex gap-3">
        <span className="bg-surface text-deep-green grid size-9 shrink-0 place-items-center rounded-full">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-surface text-deep-green rounded-full px-2 py-1 text-[0.65rem] font-semibold">
              {observation.confidence}% confidence
            </span>
            <span className="text-muted text-[0.65rem]">
              Deterministic observation
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold">{observation.title}</p>
          <p className="text-muted mt-1 text-xs leading-5">
            {observation.recommendedNextStep}
          </p>
          <Link
            href={projectId ? `/projects/${projectId}` : "/risks"}
            className="text-deep-green mt-3 inline-flex items-center gap-1 text-xs font-semibold"
          >
            Review evidence <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function OverdueActions({ view }: { view: DashboardView }) {
  const actions = view.work.overdue.slice(0, 2);
  const representedExposure = view.work.overdueExposureCents;
  return (
    <section className="border-border bg-surface shadow-surface rounded-xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          Overdue actions
        </h2>
        <Link
          href="/actions?due=overdue"
          className="text-deep-green text-xs font-semibold"
        >
          View all
        </Link>
      </div>
      <div className="mt-4 flex items-start gap-5">
        <div className="shrink-0">
          <p className="text-danger text-3xl font-light">
            {view.work.overdue.length}
          </p>
          <p className="text-muted text-[0.68rem]">Overdue</p>
          {view.canViewFinancials && representedExposure > 0 && (
            <p className="mt-2 text-xs font-semibold">
              {formatMoney(representedExposure)} at risk
            </p>
          )}
        </div>
        <ol className="border-border min-w-0 flex-1 border-l pl-4">
          {actions.length ? (
            actions.map((action) => (
              <li
                key={action.id}
                className="border-border border-b py-2 first:pt-0 last:border-0 last:pb-0"
              >
                <Link
                  href={`/risks/${action.riskId}`}
                  className="flex items-center justify-between gap-3 text-xs font-medium"
                >
                  <span className="line-clamp-1">{action.title}</span>
                  <ArrowRight
                    className="text-muted size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                </Link>
                <p className="text-danger mt-1 text-[0.65rem]">
                  {overdueLabel(action.dueAt, view.generatedAt)}
                </p>
              </li>
            ))
          ) : (
            <li className="text-muted text-xs">Nothing is overdue.</li>
          )}
        </ol>
      </div>
    </section>
  );
}

function ExecutiveRecommendations({ view }: { view: DashboardView }) {
  const recommendations = view.intelligence.executiveRecommendations.slice(
    0,
    2,
  );
  return (
    <section
      aria-label="Executive Recommendations"
      className="border-border bg-surface shadow-surface rounded-xl border p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          Executive recommendations
        </h2>
        <ListChecks className="text-deep-green size-4" aria-hidden="true" />
      </div>
      {recommendations.length ? (
        <ol className="mt-3 space-y-3">
          {recommendations.map((recommendation) => (
            <li key={recommendation.key} className="text-xs leading-5">
              <p className="font-semibold">{recommendation.title}</p>
              <p className="text-muted mt-0.5 line-clamp-2">
                {recommendation.nextStep}
              </p>
              <Link
                href={recommendation.href}
                className="text-deep-green mt-1 inline-block font-semibold"
              >
                Review
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted mt-3 text-xs">
          No recommendation is warranted by current evidence.
        </p>
      )}
    </section>
  );
}

function PortfolioAdvisor({
  view,
  topRisk,
}: {
  view: DashboardView;
  topRisk: DashboardView["priorities"][number] | null;
}) {
  const { advisorMode, selectedProjectId } = useDashboardState();
  const { projects, canUseAi } = useWorkspaceResources();
  const { ask, pending, setOpen } = useSharedAsk();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const suggestedPrompts = getSuggestedOrganizationPrompts({
    advisorMode,
    pathname: "/",
    selectedProjectName: selectedProject?.name ?? null,
    hasPortfolioObservations: view.intelligence.portfolioWatch.length > 0,
    hasRecentActivity: view.activity.length > 0,
  });
  return (
    <aside className="border-border bg-surface shadow-surface h-fit rounded-xl border p-5 2xl:sticky 2xl:top-24">
      <div className="flex items-center gap-2">
        <Sparkles className="text-deep-green size-4" aria-hidden="true" />
        <p className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          AI assistant
        </p>
      </div>
      <div className="mt-4">
        <AdvisorSelector />
      </div>
      <div className="mt-6">
        <span className="bg-soft-green text-deep-green grid size-10 place-items-center rounded-full">
          <Bot className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">
          Hi {view.currentUserName.split(" ")[0]}.{" "}
          {advisorModeLabels[advisorMode]} mode is selected.
        </h2>
        <p className="text-muted mt-2 text-sm leading-6">
          This preference is ready for future advisor behavior. Today, Ask
          Sightline answers grounded questions from a risk’s authorized
          evidence, citations, and conversation history.
        </p>
      </div>
      <p className="text-muted mt-6 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
        Suggested next steps
      </p>
      <div className="mt-3 space-y-2">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={pending || !canUseAi}
            onClick={() => ask(prompt)}
            className="border-border hover:bg-background block w-full rounded-lg border p-3 text-left text-xs leading-5 font-medium disabled:opacity-60"
          >
            {prompt}
          </button>
        ))}
      </div>
      {topRisk ? (
        <Link
          href={`${topRisk.href}?tab=ask`}
          className="bg-deep-green mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
        >
          <FileQuestion className="size-4" aria-hidden="true" />
          Ask about top risk
        </Link>
      ) : null}
      <button
        type="button"
        disabled={!canUseAi}
        onClick={() => setOpen(true)}
        className="border-border mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border px-4 text-xs font-semibold disabled:opacity-60"
      >
        Open organization assistant
      </button>
      <p className="text-muted mt-4 text-center text-[0.65rem] leading-4">
        Organization-wide questions are not yet supported. Answers remain
        bounded to authorized risk evidence.
      </p>
    </aside>
  );
}

export function filterDashboardView(
  view: DashboardView,
  projectId: string,
): DashboardView {
  if (projectId === "all") return view;
  const portfolio = view.portfolio.filter((row) => row.id === projectId);
  const heatmap = view.riskHeatmap.filter((row) => row.projectId === projectId);
  const priorities = view.priorities.filter(
    (priority) => priority.projectId === projectId,
  );
  const allowedObservationKeys = new Set(
    view.observations
      .filter((observation) =>
        observation.affectedProjectIds.includes(projectId),
      )
      .map((observation) => observation.key),
  );
  const rootCauseSuggestions = view.intelligence.rootCauseSuggestions.filter(
    (suggestion) =>
      suggestion.supportingObservations.some((observation) =>
        allowedObservationKeys.has(observation.key),
      ),
  );
  const allowedHypothesisKeys = new Set(
    rootCauseSuggestions.map((suggestion) => suggestion.key),
  );
  const scopedRiskAnalytics = view.riskAnalyticsByProject?.[projectId] ?? null;
  const projectRiskDrivers: RiskDriver[] = (scopedRiskAnalytics?.drivers ?? []).map(
    (driver) => ({
      category: driver.category,
      label: driver.label,
      riskCount: driver.activeRiskCount,
      exposureCents: driver.assessedExposureCents ?? 0,
      level: driver.highCriticalCount ? "high" : driver.averageAttentionScore >= 50 ? "medium" : "low",
    }),
  );
  const selectedPortfolio = portfolio[0];
  const selectedFinancial = view.financialAnalytics?.portfolio.projects.find(
    (project) => project.projectId === projectId,
  );
  return {
    ...view,
    priorities,
    portfolio,
    riskHeatmap: heatmap,
    riskAnalytics: scopedRiskAnalytics,
    riskDrivers: projectRiskDrivers,
    portfolioSummary: {
      activeProjects: selectedPortfolio ? 1 : 0,
      projectsAtRisk: selectedPortfolio?.openRiskCount ? 1 : 0,
      totalExposureCents: selectedPortfolio?.exposureCents ?? 0,
      forecastMarginPercent: selectedFinancial?.forecastMarginPercent ?? null,
    },
    observations: view.observations.filter((observation) =>
      allowedObservationKeys.has(observation.key),
    ),
    work: {
      ...view.work,
      overdue: view.work.overdue.filter((action) =>
        priorities.some(
          (priority) =>
            priority.kind === "action" && priority.id === `action:${action.id}`,
        ),
      ),
    },
    intelligence: {
      ...view.intelligence,
      portfolioWatch: view.intelligence.portfolioWatch.filter((observation) =>
        allowedObservationKeys.has(observation.key),
      ),
      emergingPatterns: view.intelligence.emergingPatterns.filter(
        ({ observation }) => allowedObservationKeys.has(observation.key),
      ),
      historicalComparisons: [],
      rootCauseSuggestions,
      executiveRecommendations:
        view.intelligence.executiveRecommendations.filter((recommendation) =>
          recommendation.source === "observation"
            ? allowedObservationKeys.has(
                recommendation.key.replace(/^observation:/, ""),
              )
            : allowedHypothesisKeys.has(
                recommendation.key.replace(/^hypothesis:/, ""),
              ),
        ),
    },
  };
}

function QuickPaths({
  view,
  topRisk,
}: {
  view: DashboardView;
  topRisk: DashboardView["priorities"][number] | null;
}) {
  const links = [
    {
      label: "Open executive Daily Brief",
      href: "/brief",
      icon: MessageSquareText,
    },
    {
      label: "Review portfolio performance",
      href: "/projects",
      icon: TrendingDown,
    },
    {
      label: "Prioritize overdue actions",
      href: "/actions?due=overdue",
      icon: CalendarClock,
    },
    {
      label: topRisk ? "Ask about the top risk" : "Review active risks",
      href: topRisk ? `${topRisk.href}?tab=ask` : "/risks",
      icon: FileQuestion,
    },
  ];
  return (
    <section className="bg-soft-green/65 border-border mt-4 overflow-hidden rounded-xl border">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-2">
          <Sparkles className="text-deep-green size-5" aria-hidden="true" />
          <h2 className="text-deep-green text-sm font-semibold">Quick paths</h2>
        </div>
        <p className="text-muted text-xs">
          Continue into real Sightline workflows using your current organization
          and project permissions.
        </p>
        <span className="text-muted ml-auto hidden text-[0.65rem] sm:block">
          {view.portfolioSummary.activeProjects} active projects
        </span>
      </div>
      <div className="border-border grid border-t sm:grid-cols-2 xl:grid-cols-4">
        {links.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="border-border bg-surface/80 hover:bg-surface flex min-h-14 items-center gap-3 border-b px-5 text-xs font-medium sm:border-r xl:border-b-0 xl:last:border-r-0"
          >
            <Icon className="text-muted size-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function changeSummary(view: DashboardView) {
  const newRisks = view.overnight.newRisks.value;
  const resolved = view.overnight.resolvedRisks.value;
  const overdue = view.overnight.overdueActions.value;
  return `Since the start of today: ${newRisks} new risk${newRisks === 1 ? "" : "s"}, ${resolved} resolved, and ${overdue} overdue action${overdue === 1 ? "" : "s"}.`;
}

function overdueLabel(dueAt: string | null, generatedAt: string) {
  if (!dueAt) return "Due date unavailable";
  const days = Math.max(
    1,
    Math.floor((Date.parse(generatedAt) - Date.parse(dueAt)) / 86_400_000),
  );
  return `${days} day${days === 1 ? "" : "s"} overdue`;
}
