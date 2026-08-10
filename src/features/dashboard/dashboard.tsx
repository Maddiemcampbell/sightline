"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileQuestion,
  ListChecks,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRoundX,
  XCircle,
  Clock3,
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
import {
  formatDueUrgency,
  formatCompactCurrency,
  heatmapCellLabel,
  projectScopeLabel,
} from "@/features/dashboard/presentation";

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
  const [mobileAnalyticsExpanded, setMobileAnalyticsExpanded] = useState(false);
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
      <section className="relative isolate overflow-hidden rounded-2xl bg-[#f7f7f1] px-6 py-7 sm:px-8 lg:px-10 lg:py-9">
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-deep-green text-xs font-semibold tracking-[0.1em] uppercase">
              Portfolio home
            </p>
            <span className="text-muted text-xs">·</span>
            <p className="text-muted text-xs font-medium">{date}</p>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[2.6rem]">
            Good morning, {firstName}.
          </h1>
          <p className="text-muted mt-4 text-sm leading-6 sm:text-base">
            {selectedProject
              ? `Dashboard intelligence is scoped to ${selectedProject.name}.`
              : changeSummary(view)}
          </p>
          {filteredView.intelligence.portfolioWatch.length ? (
            <p className="text-muted mt-1 text-sm leading-6 sm:text-base">
              Sightline found{" "}
              <span>
                {filteredView.intelligence.portfolioWatch.length} portfolio
                signal
                {filteredView.intelligence.portfolioWatch.length === 1
                  ? ""
                  : "s"}
              </span>{" "}
              that currently{" "}
              {filteredView.intelligence.portfolioWatch.length === 1
                ? "deserves"
                : "deserve"}{" "}
              executive attention.
            </p>
          ) : (
            <p className="text-muted mt-1 text-sm leading-6 sm:text-base">
              No portfolio signals currently require executive attention.
            </p>
          )}
          <p className="bg-accent/45 text-deep-green mt-3 w-fit rounded-full px-3 py-1 text-xs font-semibold">
            Scope:{" "}
            {projectScopeLabel(selectedProject?.name ?? null, projects.length)}
          </p>
          <Link
            href="/brief"
            className="bg-deep-green mt-5 flex min-h-11 w-fit items-center gap-3 rounded-md px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#0f3026]"
          >
            <MessageSquareText className="size-4" aria-hidden="true" />
            Open Daily Brief
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="flex flex-col">
        <div className="order-1 lg:order-2">
          <AttentionQueue view={filteredView} />
        </div>
        <div className="order-2 lg:order-1">
          <MovementSummary view={filteredView} />
        </div>
      </div>

      <div className="mt-4 max-w-full min-w-0">
        <button
          type="button"
          aria-expanded={mobileAnalyticsExpanded}
          aria-controls="portfolio-analytics"
          onClick={() => setMobileAnalyticsExpanded((expanded) => !expanded)}
          className="dashboard-card text-deep-green flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold md:hidden"
        >
          <span>
            <span className="block">Explore portfolio analytics</span>
            <span className="text-muted mt-0.5 block text-xs font-normal">
              Overview, risk drivers, hotspots, and recommendations
            </span>
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${
              mobileAnalyticsExpanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
        <div
          id="portfolio-analytics"
          className={`${mobileAnalyticsExpanded ? "block" : "hidden"} max-w-full min-w-0 overflow-x-clip md:block`}
        >
          <div className="mt-4 grid max-w-full min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="min-w-0 space-y-4">
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,0.8fr)]">
                <PortfolioOverview view={filteredView} />
                <RiskDrivers
                  drivers={filteredView.riskDrivers}
                  canViewFinancials={filteredView.canViewFinancials}
                />
              </div>

              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
                <div className="min-w-0 space-y-4">
                  <RiskHeatmap
                    analytics={filteredView.riskAnalytics ?? null}
                    fallbackRows={filteredView.riskHeatmap}
                  />
                  <ResponseReadiness view={filteredView} />
                </div>
                <div className="space-y-4">
                  <RecentIntelligence view={filteredView} />
                  <OverdueActions view={filteredView} />
                  <ExecutiveRecommendations view={filteredView} />
                </div>
              </div>
            </div>

            <PortfolioAdvisor view={filteredView} topRisk={topRisk ?? null} />
          </div>
        </div>
      </div>

      <QuickPaths view={filteredView} topRisk={topRisk ?? null} />
    </div>
  );
}

function MovementSummary({ view }: { view: DashboardView }) {
  const changes = [
    {
      label: "New risks",
      value: view.overnight.newRisks.value,
      detail: comparisonLabel(view.overnight.newRisks),
      tone: view.overnight.newRisks.value ? "warning" : "neutral",
    },
    {
      label: "Resolved",
      value: view.overnight.resolvedRisks.value,
      detail: comparisonLabel(view.overnight.resolvedRisks),
      tone: view.overnight.resolvedRisks.value ? "positive" : "neutral",
    },
    {
      label: "Overdue actions",
      value: view.overnight.overdueActions.value,
      detail: comparisonLabel(view.overnight.overdueActions),
      tone: view.overnight.overdueActions.value ? "warning" : "neutral",
    },
    {
      label: "Awaiting you",
      value: view.overnight.awaitingUser.value,
      detail: comparisonLabel(view.overnight.awaitingUser),
      tone: view.overnight.awaitingUser.value ? "attention" : "neutral",
    },
  ] as const;
  return (
    <section
      aria-labelledby="portfolio-movement"
      className="border-border bg-surface mt-4 overflow-hidden rounded-xl border"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <Clock3 className="text-deep-green size-4" aria-hidden="true" />
          <h2 id="portfolio-movement" className="text-sm font-semibold">
            Since your last visit
          </h2>
        </div>
        <span className="text-muted text-xs">
          Compared with the prior snapshot
        </span>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {changes.map((change) => (
          <div
            key={change.label}
            className="border-border flex items-center justify-between gap-4 border-b px-5 py-4 sm:border-r xl:border-b-0"
          >
            <div>
              <p className="text-muted text-xs">{change.label}</p>
              <p className="mt-1 text-xs font-medium">{change.detail}</p>
            </div>
            <span
              className={`grid size-9 place-items-center rounded-full text-sm font-semibold tabular-nums ${
                change.tone === "warning"
                  ? "bg-soft-red text-danger"
                  : change.tone === "positive"
                    ? "bg-soft-green text-deep-green"
                    : change.tone === "attention"
                      ? "bg-soft-amber text-warning"
                      : "bg-background text-muted"
              }`}
            >
              {change.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttentionQueue({ view }: { view: DashboardView }) {
  const priorities = view.priorities.slice(0, 4);
  return (
    <section
      aria-labelledby="needs-attention"
      className="dashboard-card mt-4 overflow-hidden p-0"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <p className="text-deep-green text-xs font-semibold tracking-[0.09em] uppercase">
            Decision queue
          </p>
          <h2 id="needs-attention" className="mt-1 text-xl font-semibold">
            Needs attention
          </h2>
          <p className="text-muted mt-1 text-sm">
            Highest-ranked risks and actions in the current project scope.
          </p>
        </div>
        <Link
          href="/brief"
          className="text-deep-green inline-flex items-center gap-1 text-sm font-semibold"
        >
          Review today&apos;s brief{" "}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {priorities.length ? (
        <ol className="border-border divide-border divide-y border-t">
          {priorities.map((priority, index) => (
            <li key={priority.id}>
              <Link
                href={priority.href}
                className="hover:bg-background grid gap-3 px-5 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <span className="bg-soft-green text-deep-green grid size-7 place-items-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase ${priority.kind === "risk" ? "bg-soft-red text-danger" : "bg-soft-amber text-warning"}`}
                    >
                      {priority.kind}
                    </span>
                    <span className="text-muted text-xs">
                      {priority.projectName}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {priority.title}
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {priority.reason} · {priority.ownerName}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-muted text-xs">
                    {priority.dueAt
                      ? formatDueUrgency(priority.dueAt, view.generatedAt)
                      : priority.nextAction}
                  </span>
                  <ArrowRight
                    className="text-muted size-4 shrink-0"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-border flex items-center gap-3 border-t px-5 py-5 sm:px-6">
          <CheckCircle2 className="text-deep-green size-5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">
              No priority items need attention
            </p>
            <p className="text-muted mt-1 text-xs">
              Current records do not meet the attention threshold for this
              scope.
            </p>
          </div>
        </div>
      )}
    </section>
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
  const riskPercent = summary.activeProjects
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round((summary.projectsAtRisk / summary.activeProjects) * 100),
        ),
      )
    : 0;
  const portfolioStatus =
    summary.projectsAtRisk === 0
      ? "No projects currently need attention"
      : summary.projectsAtRisk === summary.activeProjects
        ? "Portfolio-wide attention required"
        : `${summary.projectsAtRisk} projects need attention`;
  const budgetPosition = formatBudgetPosition(budgetVariance?.valueCents);
  return (
    <section aria-label="Portfolio Watch" className="dashboard-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-deep-green text-xs font-semibold tracking-[0.09em] uppercase">
            Portfolio Watch
          </p>
          <h2 className="mt-1 text-lg font-semibold">Portfolio overview</h2>
        </div>
        <ProjectFilter />
      </div>
      <div
        className={`mt-4 rounded-xl border p-4 ${
          summary.projectsAtRisk
            ? "border-[#edc3bb] bg-[#fff8f6]"
            : "border-[#bfd8c4] bg-[#f5faf5]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-full ${
                summary.projectsAtRisk
                  ? "bg-[#f8d7d2] text-[#8f281c]"
                  : "bg-[#dff0e2] text-[#185d2a]"
              }`}
            >
              {summary.projectsAtRisk ? (
                <ShieldAlert className="size-5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="text-muted text-xs font-semibold tracking-[0.08em] uppercase">
                Portfolio status
              </p>
              <p className="mt-1 text-lg font-semibold">{portfolioStatus}</p>
              <p className="text-muted mt-1 text-xs leading-5">
                {summary.projectsAtRisk} of {summary.activeProjects} active
                projects have an unresolved risk signal.
              </p>
            </div>
          </div>
          <Link
            href="/risks"
            className="border-border bg-surface text-deep-green inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
          >
            Review risks
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-white ring-1 ring-black/5"
            role="progressbar"
            aria-label="Active projects with unresolved risk signals"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={riskPercent}
          >
            <div
              className={`h-full rounded-full ${
                summary.projectsAtRisk ? "bg-status-high" : "bg-status-low"
              }`}
              style={{ width: `${riskPercent}%` }}
            />
          </div>
          <span className="min-w-10 text-right text-xs font-semibold tabular-nums">
            {riskPercent}%
          </span>
        </div>
      </div>
      <div
        className={`mt-3 grid gap-3 ${
          view.canViewFinancials ? "sm:grid-cols-3" : "sm:grid-cols-1"
        }`}
      >
        <OverviewMetric
          label="Portfolio size"
          value={String(summary.activeProjects)}
          detail={`${view.portfolio.length} active project${view.portfolio.length === 1 ? "" : "s"} visible to you`}
          icon={BriefcaseBusiness}
          tone="neutral"
        />
        {view.canViewFinancials ? (
          <>
            <OverviewMetric
              label="Budget variance"
              value={budgetPosition.value}
              detail={
                budgetVariance
                  ? `${budgetPosition.detail} · ${budgetVariance.quality} data`
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
                summary.forecastMarginPercent === null
                  ? "—"
                  : `${summary.forecastMarginPercent}%`
              }
              detail={
                summary.forecastMarginPercent === null
                  ? "No active-project forecast for this scope"
                  : "Projected active-project margin"
              }
              icon={TrendingUp}
              tone={
                summary.forecastMarginPercent !== null ? "positive" : "neutral"
              }
            />
          </>
        ) : null}
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
    <div className="border-border bg-background/45 rounded-lg border p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted text-xs font-medium">{label}</p>
        <span className="bg-surface grid size-7 place-items-center rounded-md border">
          <Icon className="text-muted size-3.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xl font-semibold tracking-[-0.035em] tabular-nums">
        {value}
      </p>
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

function formatBudgetPosition(valueCents: number | null | undefined) {
  if (valueCents === null || valueCents === undefined)
    return { value: "—", detail: "Budget position unavailable" };
  if (valueCents === 0) return { value: "On budget", detail: "No variance" };
  return valueCents > 0
    ? {
        value: `${formatCompactCurrency(valueCents)} under`,
        detail: "Projected under budget",
      }
    : {
        value: `${formatCompactCurrency(Math.abs(valueCents))} over`,
        detail: "Projected over budget",
      };
}

function RiskDrivers({
  drivers,
  canViewFinancials,
}: {
  drivers: readonly RiskDriver[];
  canViewFinancials: boolean;
}) {
  return (
    <section className="dashboard-card h-fit p-5">
      <div>
        <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          Top risk drivers
        </h2>
        <p className="text-muted mt-1 text-xs leading-5">
          Categories where active portfolio risk is concentrated.
        </p>
      </div>
      {drivers.length ? (
        <ol className="mt-4 space-y-2">
          {drivers.map((driver, index) => (
            <li key={driver.category}>
              <Link
                href={`/risks?category=${driver.category}`}
                className="border-border hover:border-deep-green hover:bg-background group flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
              >
                <span className="bg-soft-green text-deep-green grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {driver.label}
                  </span>
                  <span className="text-muted mt-0.5 block truncate text-xs">
                    {driver.riskCount} active risk
                    {driver.riskCount === 1 ? "" : "s"}
                    {canViewFinancials && driver.exposureCents
                      ? ` · ${formatMoney(driver.exposureCents)} exposure`
                      : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <SeverityBadge severity={driver.level} />
                  <ArrowRight
                    className="text-muted size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed p-4 text-center">
          <XCircle className="text-muted mx-auto size-5" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold">No active risk drivers</p>
          <p className="text-muted mt-1 text-xs">
            The current accessible project scope has no unresolved risks.
          </p>
          <Link
            href="/risks"
            className="text-deep-green mt-3 inline-block text-xs font-semibold"
          >
            Review all risks
          </Link>
        </div>
      )}
      <Link
        href="/risks"
        className="text-deep-green border-border mt-4 inline-flex min-h-10 w-full items-center justify-between border-t pt-3 text-xs font-semibold"
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
  if (!analytics) return <LegacyRiskHeatmap rows={fallbackRows} />;
  const categoryLabels = new Map(
    categories.map((category) => [category.id, category.label]),
  );
  const hotspots = rows
    .flatMap((row) =>
      row.cells
        .filter((cell) => cell.activeRiskCount > 0)
        .map((cell) => ({
          ...cell,
          projectName: row.projectName,
          categoryLabel: categoryLabels.get(cell.category) ?? cell.category,
        })),
    )
    .toSorted(
      (left, right) =>
        severityRank(right.highestSeverity) -
          severityRank(left.highestSeverity) ||
        (right.attentionScore ?? 0) - (left.attentionScore ?? 0) ||
        right.activeRiskCount - left.activeRiskCount ||
        left.projectName.localeCompare(right.projectName),
    );
  const affectedProjects = new Set(hotspots.map((hotspot) => hotspot.projectId))
    .size;
  return (
    <section className="dashboard-card overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
            Risk hotspots
          </h2>
          <p className="text-muted mt-1 text-xs leading-5">
            Projects and risk categories requiring attention, ranked by severity
            and urgency.
          </p>
        </div>
        <Link
          href="/risks"
          className="text-deep-green shrink-0 text-xs font-semibold"
        >
          View risks
        </Link>
      </div>
      {hotspots.length ? (
        <>
          <ol className="mt-5 space-y-2">
            {hotspots.slice(0, 5).map((hotspot, index) => (
              <li key={`${hotspot.projectId}:${hotspot.category}`}>
                <Link
                  href={hotspot.href}
                  aria-label={heatmapCellLabel(
                    hotspot.projectName,
                    hotspot.categoryLabel,
                    hotspot,
                  )}
                  className="border-border hover:border-deep-green hover:bg-background group flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
                >
                  <span className="bg-soft-green text-deep-green grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {hotspot.projectName}
                    </span>
                    <span className="text-muted mt-0.5 block truncate text-xs capitalize">
                      {hotspot.categoryLabel}
                      {hotspot.assessedExposureCents !== null
                        ? ` · ${formatCompactCurrency(hotspot.assessedExposureCents)} assessed exposure`
                        : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <SeverityBadge severity={hotspot.highestSeverity} />
                    <span className="text-muted hidden text-xs sm:inline">
                      {hotspot.activeRiskCount} risk
                      {hotspot.activeRiskCount === 1 ? "" : "s"}
                    </span>
                    <ArrowRight
                      className="text-muted size-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="text-muted mt-3 text-xs">
            Showing {Math.min(5, hotspots.length)} of {hotspots.length} active
            signal{hotspots.length === 1 ? "" : "s"} across {affectedProjects}{" "}
            project{affectedProjects === 1 ? "" : "s"}.
          </p>
          <details className="group border-border mt-4 border-t pt-3">
            <summary className="text-deep-green flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold [&::-webkit-details-marker]:hidden">
              View full project-by-category matrix
              <ChevronDown
                className="size-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="bg-soft-blue text-info mt-2 rounded-md px-3 py-2 text-xs font-medium">
              Scroll horizontally to compare all {categories.length} risk
              categories →
            </p>
            <div
              className="mt-3 overflow-x-auto pb-2"
              tabIndex={0}
              aria-label="Scrollable project-by-category risk matrix"
            >
              <table className="w-full min-w-max text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="bg-surface sticky left-0 z-10 min-w-44 pb-3 font-medium">
                      Project
                    </th>
                    {categories.map((column) => (
                      <th
                        key={column.id}
                        className="min-w-24 px-3 pb-3 text-center font-medium capitalize"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.projectId} className="border-border border-t">
                      <th className="bg-surface sticky left-0 z-10 max-w-48 py-3 pr-3 font-medium">
                        <Link href={`/projects/${row.projectId}`}>
                          {row.projectName}
                        </Link>
                      </th>
                      {row.cells.map((cell) => (
                        <td
                          key={cell.category}
                          className="px-3 py-3 text-center"
                        >
                          {cell.activeRiskCount ? (
                            <Link
                              href={cell.href}
                              aria-label={heatmapCellLabel(
                                row.projectName,
                                categoryLabels.get(cell.category) ??
                                  cell.category,
                                cell,
                              )}
                              title={cell.explanation}
                              className="focus-visible:outline-offset-2"
                            >
                              <MatrixSignal cell={cell} />
                            </Link>
                          ) : (
                            <span
                              className="text-muted inline-flex min-w-12 justify-center rounded-md bg-[#f1f2ef] px-2 py-1 font-semibold"
                              aria-label={`${row.projectName}, ${categoryLabels.get(cell.category) ?? cell.category}: no active risks`}
                            >
                              —
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed p-5 text-center">
          <p className="text-sm font-semibold">
            No active risk hotspots for this scope
          </p>
          <p className="text-muted mt-1 text-xs">
            Choose another accessible project or review the risk register.
          </p>
          <Link
            href="/risks"
            className="text-deep-green mt-3 inline-block text-xs font-semibold"
          >
            Open risk register
          </Link>
        </div>
      )}
    </section>
  );
}

function severityRank(severity: string | null) {
  return severity === "critical"
    ? 4
    : severity === "high"
      ? 3
      : severity === "medium"
        ? 2
        : severity === "low"
          ? 1
          : 0;
}

function severityPresentation(severity: string | null) {
  if (severity === "critical")
    return {
      label: "Critical",
      symbol: "!",
      className: "bg-[#f8d7d2] text-[#7a2017] ring-[#d88d83]",
    };
  if (severity === "high")
    return {
      label: "High",
      symbol: "H",
      className: "bg-[#fbe9e6] text-[#8f281c] ring-[#e4aaa2]",
    };
  if (severity === "medium")
    return {
      label: "Medium",
      symbol: "M",
      className: "bg-[#fff2c2] text-[#694d00] ring-[#dfbf55]",
    };
  return {
    label: "Low",
    symbol: "L",
    className: "bg-[#e2f3e6] text-[#185d2a] ring-[#8fc89b]",
  };
}

function SeverityBadge({ severity }: { severity: string | null }) {
  const presentation = severityPresentation(severity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ring-1 ${presentation.className}`}
    >
      <span aria-hidden="true">{presentation.symbol}</span>
      {presentation.label}
    </span>
  );
}

function MatrixSignal({
  cell,
}: {
  cell: RiskAnalyticsOutput["heatmap"][number]["cells"][number];
}) {
  const presentation = severityPresentation(cell.highestSeverity);
  return (
    <span
      className={`inline-flex min-w-12 items-center justify-center gap-1 rounded-md px-2 py-1 font-bold ring-1 ${presentation.className}`}
      aria-hidden="true"
    >
      {presentation.symbol} {cell.activeRiskCount}
    </span>
  );
}

function ResponseReadiness({ view }: { view: DashboardView }) {
  const ownershipGap = view.work.unownedRisks[0] ?? null;
  const dueToday = view.work.dueToday[0] ?? null;

  return (
    <section
      className="dashboard-card p-5"
      aria-labelledby="response-readiness"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="response-readiness"
            className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase"
          >
            Response readiness
          </h2>
          <p className="text-muted mt-1 text-xs leading-5">
            Whether active portfolio risk has an owner and a response in motion.
          </p>
        </div>
        <Link
          href="/actions"
          className="text-deep-green shrink-0 text-xs font-semibold"
        >
          View actions
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ReadinessMetric
          label="Unassigned risks"
          value={view.work.unownedRisks.length}
          icon={UserRoundX}
          needsAttention={view.work.unownedRisks.length > 0}
        />
        <ReadinessMetric
          label="Due today"
          value={view.work.dueToday.length}
          icon={CalendarClock}
          needsAttention={view.work.dueToday.length > 0}
        />
        <ReadinessMetric
          label="Waiting externally"
          value={view.work.waitingExternal.length}
          icon={Clock3}
        />
        <ReadinessMetric
          label="Recently completed"
          value={view.work.recentlyCompleted.length}
          icon={CheckCircle2}
          positive
        />
      </dl>
      {ownershipGap ? (
        <Link
          href={`/risks/${ownershipGap.id}`}
          className="border-border hover:border-deep-green hover:bg-background mt-4 flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3"
        >
          <span className="min-w-0">
            <span className="text-danger block text-xs font-semibold tracking-[0.06em] uppercase">
              Next ownership gap
            </span>
            <span className="mt-1 block truncate text-sm font-semibold">
              {ownershipGap.title}
            </span>
            <span className="text-muted mt-0.5 block truncate text-xs">
              {ownershipGap.projectName} · Assign an owner
            </span>
          </span>
          <ArrowRight
            className="text-muted size-4 shrink-0"
            aria-hidden="true"
          />
        </Link>
      ) : dueToday ? (
        <Link
          href={`/risks/${dueToday.riskId}?tab=actions#risk-section-content`}
          className="border-border hover:border-deep-green hover:bg-background mt-4 flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3"
        >
          <span className="min-w-0">
            <span className="text-warning block text-xs font-semibold tracking-[0.06em] uppercase">
              Due today
            </span>
            <span className="mt-1 block truncate text-sm font-semibold">
              {dueToday.title}
            </span>
            <span className="text-muted mt-0.5 block text-xs">
              Open the action and confirm next steps
            </span>
          </span>
          <ArrowRight
            className="text-muted size-4 shrink-0"
            aria-hidden="true"
          />
        </Link>
      ) : (
        <div className="border-border bg-soft-green mt-4 flex items-center gap-3 rounded-lg border px-4 py-3">
          <CheckCircle2
            className="text-status-low size-5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold">Ownership is covered</p>
            <p className="text-muted mt-0.5 text-xs">
              No unassigned risks or actions due today in this scope.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ReadinessMetric({
  label,
  value,
  icon: Icon,
  needsAttention = false,
  positive = false,
}: {
  label: string;
  value: number;
  icon: typeof ShieldAlert;
  needsAttention?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="border-border bg-background/45 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <dt className="text-muted text-[0.7rem] leading-4 font-medium">
          {label}
        </dt>
        <Icon
          className={`size-3.5 shrink-0 ${
            needsAttention
              ? "text-danger"
              : positive
                ? "text-status-low"
                : "text-muted"
          }`}
          aria-hidden="true"
        />
      </div>
      <dd
        className={`mt-2 text-xl font-semibold tabular-nums ${
          needsAttention
            ? "text-danger"
            : positive
              ? "text-deep-green"
              : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function LegacyRiskHeatmap({
  rows,
}: {
  rows: readonly PortfolioRiskHeatmapRow[];
}) {
  return (
    <section className="dashboard-card overflow-hidden p-5">
      <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
        Risk hotspots
      </h2>
      <p className="text-muted mt-1 text-xs">
        Highest unresolved severity by project and risk group.
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <tbody>
            {rows.map((row) => (
              <HeatmapRow key={row.projectId} row={row} />
            ))}
          </tbody>
        </table>
      </div>
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
                    ? "bg-status-medium"
                    : severity === "low"
                      ? "bg-status-low"
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
    <section className="dashboard-card p-5">
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
        <div className="mt-4 rounded-lg border border-dashed p-4">
          <p className="text-sm font-semibold">
            No evidence-backed insight for this scope
          </p>
          <p className="text-muted mt-1 text-xs leading-5">
            Sightline only surfaces observations that meet its deterministic
            evidence threshold.
          </p>
          <Link
            href="/risks"
            className="text-deep-green mt-2 inline-block text-xs font-semibold"
          >
            Review source risks
          </Link>
        </div>
      )}
      {hypothesis && (
        <div
          id={`hypothesis-${hypothesis.key}`}
          className="border-border mt-4 scroll-mt-24 border-t pt-4"
        >
          <p className="text-warning text-xs font-semibold uppercase">
            Hypothesis — not a conclusion
          </p>
          <p className="mt-1 text-sm font-semibold">{hypothesis.title}</p>
          <p className="text-muted mt-1 text-xs leading-5">
            {hypothesis.confidence}% confidence · Review assumptions before
            acting.
          </p>
          <details className="group mt-3 text-xs">
            <summary className="border-border text-deep-green hover:bg-background flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-md border px-3 font-semibold [&::-webkit-details-marker]:hidden">
              Review hypothesis evidence
              <ChevronDown
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
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
          <p className="text-deep-green text-xs font-semibold uppercase">
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
            <span className="bg-accent text-deep-green rounded-full px-2 py-1 text-xs font-semibold">
              {observation.confidence}% confidence
            </span>
            <span className="text-muted text-xs">
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
    <section className="dashboard-card p-5">
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
          <p className="text-muted text-xs">Overdue</p>
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
                <p className="text-danger mt-1 text-xs">
                  {overdueLabel(action.dueAt, view.generatedAt)}
                </p>
                <p className="text-muted mt-1 text-xs">
                  {view.priorities.find(
                    (priority) => priority.id === `action:${action.id}`,
                  )?.projectName ?? "Portfolio"}{" "}
                  · {action.ownerName ?? "Unassigned"}
                </p>
              </li>
            ))
          ) : (
            <li>
              <p className="text-deep-green text-xs font-semibold">
                You’re caught up
              </p>
              <p className="text-muted mt-1 text-xs">
                No mitigation actions are overdue in this scope.
              </p>
            </li>
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
      className="dashboard-card p-5"
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
    <aside
      className="dashboard-card h-fit p-5 xl:sticky xl:top-24"
      aria-label="Sightline AI assistant"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="text-deep-green size-4" aria-hidden="true" />
        <p className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          AI assistant
        </p>
      </div>
      <div className="mt-4">
        <AdvisorSelector />
      </div>
      <div className="mt-4">
        <span className="bg-soft-green text-deep-green grid size-8 place-items-center rounded-full">
          <Bot className="size-4" aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-base leading-6 font-semibold">
          Hi {view.currentUserName.split(" ")[0]}.{" "}
          {advisorModeLabels[advisorMode]} mode is selected.
        </h2>
        <p className="text-muted mt-1 text-xs leading-5">
          Ask portfolio questions using your current advisor mode, accessible
          project scope, authoritative analytics, and cited evidence.
        </p>
      </div>
      <p className="text-muted mt-4 text-xs font-semibold tracking-[0.08em] uppercase">
        Suggested next steps
      </p>
      <div className="mt-3 space-y-2">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={pending || !canUseAi}
            onClick={() => ask(prompt)}
            className="border-border hover:bg-background block w-full rounded-lg border px-3 py-2.5 text-left text-xs leading-5 font-medium disabled:opacity-60"
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
      <p className="text-muted mt-4 text-center text-xs leading-4">
        AI can make mistakes. Verify important information using the supplied
        citations and source records.
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
  const scopedRiskIds = new Set(
    scopedRiskAnalytics?.executiveRisks.map((risk) => risk.riskId) ?? [],
  );
  const projectRiskDrivers: RiskDriver[] = (
    scopedRiskAnalytics?.drivers ?? []
  ).map((driver) => ({
    category: driver.category,
    label: driver.label,
    riskCount: driver.activeRiskCount,
    exposureCents: driver.assessedExposureCents ?? 0,
    level: driver.highCriticalCount
      ? "high"
      : driver.averageAttentionScore >= 50
        ? "medium"
        : "low",
  }));
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
      dueToday: view.work.dueToday.filter((action) =>
        scopedRiskIds.has(action.riskId),
      ),
      overdue: view.work.overdue.filter((action) =>
        scopedRiskIds.has(action.riskId),
      ),
      overdueExposureCents: priorities
        .filter((priority) => priority.kind === "action")
        .reduce((sum, priority) => sum + (priority.exposureCents ?? 0), 0),
      waitingExternal: view.work.waitingExternal.filter((action) =>
        scopedRiskIds.has(action.riskId),
      ),
      recentlyCompleted: view.work.recentlyCompleted.filter((action) =>
        scopedRiskIds.has(action.riskId),
      ),
      unownedRisks: view.work.unownedRisks.filter((risk) =>
        scopedRiskIds.has(risk.id),
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
        <span className="text-muted ml-auto hidden text-xs sm:block">
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

function comparisonLabel(comparison: {
  value: number;
  previousValue: number | null;
}) {
  if (comparison.previousValue === null) return "Current snapshot";
  const difference = comparison.value - comparison.previousValue;
  if (difference === 0) return "Unchanged";
  return `${Math.abs(difference)} ${difference > 0 ? "more" : "fewer"}`;
}

function overdueLabel(dueAt: string | null, generatedAt: string) {
  return formatDueUrgency(dueAt, generatedAt);
}
