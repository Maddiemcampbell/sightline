import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CircleDollarSign,
  ListFilter,
  Minus,
  Search,
  ShieldAlert,
  Sparkles,
  Plus,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/daily-brief/formatters";
import { getProjects, type ProjectListView } from "@/features/portfolio/data";
import { Pagination } from "@/features/portfolio/pagination-controls";
import { ProjectsAssistant } from "@/features/portfolio/projects-assistant";
import { projectFiltersSchema } from "@/features/portfolio/validation";
import { WatchlistButton } from "@/features/workspace/watchlist-button";
import { canCreateProject } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const fallbackImage = "/images/project-fallback-architecture-v2.png";

export default async function ProjectsPage({ searchParams }: Props) {
  const context = await requireActorContext();
  const canCreate = canCreateProject(context, {
    organization_id: context.organizationId,
  });
  const filters = projectFiltersSchema.parse(await searchParams);
  const result = await getProjects(filters);
  const projects = result.items;
  const {
    activeCount: activeProjects,
    atRiskCount: atRiskProjects,
    totalExposureCents: totalExposure,
    averageMarginPercent: averageMargin,
  } = result.summary;

  return (
    <div className="mx-auto max-w-[96rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-deep-green text-sm font-semibold">Portfolio</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Projects
          </h1>
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6 sm:text-base">
            Compare project health, financial outlook, schedule, and emerging
            risk across your accessible portfolio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/brief"
            className="border-border bg-surface text-deep-green hover:bg-background inline-flex min-h-10 w-fit items-center gap-2 rounded-md border px-4 text-sm font-semibold"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Open Daily Brief
          </Link>
          {canCreate ? (
            <Link
              href="/projects/new"
              className="bg-deep-green hover:bg-ink inline-flex min-h-10 w-fit items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
            >
              <Plus aria-hidden="true" className="size-4" />
              New project
            </Link>
          ) : null}
        </div>
      </header>

      <section
        aria-label="Portfolio summary"
        className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryMetric
          label="Active projects"
          value={String(activeProjects)}
          detail={`${result.total} filtered projects`}
          icon={BriefcaseBusiness}
        />
        <SummaryMetric
          label="Projects at risk"
          value={String(atRiskProjects)}
          detail={atRiskProjects ? "Needs attention" : "No elevated signal"}
          icon={ShieldAlert}
          warning={atRiskProjects > 0}
        />
        <SummaryMetric
          label="Represented exposure"
          value={
            projects.some((project) => project.exposureCents !== null)
              ? formatMoney(totalExposure)
              : "Restricted"
          }
          detail="Across current filtered results"
          icon={CircleDollarSign}
        />
        <SummaryMetric
          label="Average forecast margin"
          value={
            averageMargin === null
              ? "Not available"
              : `${averageMargin.toFixed(1)}%`
          }
          detail="Projects with available financials"
          icon={ArrowUpRight}
        />
      </section>

      <form
        method="get"
        className="dashboard-card mt-8 grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_11rem_13rem_auto]"
        aria-label="Project filters"
      >
        <label className="relative sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search projects</span>
          <Search
            aria-hidden="true"
            className="text-muted absolute top-3 left-3 size-4"
          />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search projects…"
            className="border-border bg-surface h-10 w-full rounded-md border pr-3 pl-9 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">Stage</span>
          <select
            name="stage"
            defaultValue={filters.stage}
            className="border-border bg-surface h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="all">All stages</option>
            <option value="active">Active</option>
            <option value="planning">Planning</option>
            <option value="on_hold">On hold</option>
            <option value="complete">Complete</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort projects</span>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="border-border bg-surface h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="exposure">Highest exposure</option>
            <option value="margin">Lowest margin</option>
            <option value="name">Name</option>
            <option value="activity">Recent activity</option>
          </select>
        </label>
        <button className="bg-deep-green hover:bg-ink flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white">
          <ListFilter aria-hidden="true" className="size-4" />
          Apply
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-muted text-sm">
          {result.total} project{result.total === 1 ? "" : "s"}
        </p>
        <p className="text-muted hidden text-xs sm:block">
          Financial details respect your organization role.
        </p>
      </div>

      <div className="mt-4 grid items-start gap-4 min-[112rem]:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          {projects.length === 0 ? (
            <EmptyState
              title={
                !filters.q && filters.stage === "all"
                  ? "Create your first project"
                  : "No projects match"
              }
              description={
                !filters.q && filters.stage === "all"
                  ? "Start a secure workspace for project risks, actions, documents, and collaboration."
                  : "Adjust the search or stage filter to see more projects."
              }
              action={
                <Link
                  href={
                    !filters.q && filters.stage === "all" && canCreate
                      ? "/projects/new"
                      : "/projects"
                  }
                  className="text-deep-green text-sm font-semibold"
                >
                  {!filters.q && filters.stage === "all" && canCreate
                    ? "Add first project"
                    : "Clear filters"}
                </Link>
              }
            />
          ) : (
            <>
              <ProjectTable projects={projects} />
              <ProjectCards projects={projects} />
              <Pagination
                path="/projects"
                page={result.page}
                pageSize={result.pageSize}
                total={result.total}
                parameters={filters}
              />
            </>
          )}
        </div>
        <ProjectsAssistant />
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof BriefcaseBusiness;
  warning?: boolean;
}) {
  return (
    <Card className="flex min-h-36 flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted text-xs font-semibold">{label}</p>
        <Icon aria-hidden="true" className="text-muted size-4" />
      </div>
      <div>
        <p className="mt-5 text-2xl font-semibold tracking-[-0.035em] tabular-nums">
          {value}
        </p>
        <p
          className={`mt-1 text-xs ${warning ? "text-danger" : "text-deep-green"}`}
        >
          {detail}
        </p>
      </div>
    </Card>
  );
}

function ProjectTable({ projects }: { projects: readonly ProjectListView[] }) {
  const columns = [
    "Project",
    "Health",
    "Status",
    "Budget",
    "Forecast margin",
    "Schedule",
    "Risk score",
    "AI summary",
  ];
  return (
    <div className="dashboard-card hidden overflow-hidden xl:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[76rem] table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">
            Project portfolio health, finances, schedule, risk, and AI summary
          </caption>
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead>
            <tr className="bg-background/60 border-border border-b">
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="text-muted px-4 py-3 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-border group hover:bg-background/45 border-b last:border-b-0"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={project.imageUrl ?? fallbackImage}
                      alt=""
                      width={72}
                      height={48}
                      className="bg-background h-12 w-[4.5rem] shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-ink group-hover:text-deep-green group-hover:underline"
                        >
                          {project.name}
                        </Link>
                      </h2>
                      <p className="text-muted mt-1 truncate text-xs">
                        {project.number} ·{" "}
                        {project.location || "Location unavailable"}
                      </p>
                    </div>
                    <WatchlistButton
                      item={watchlistItem(project)}
                      className="size-8 opacity-80"
                    />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ProjectBadge kind={project.health} />
                </td>
                <td className="px-4 py-4">
                  <ProjectBadge kind={project.stage} />
                </td>
                <td className="px-4 py-4">
                  <FinancialValue value={project.contractValueCents} />
                  <p className="text-muted mt-1 text-[0.6875rem]">
                    Current contract
                  </p>
                </td>
                <td className="px-4 py-4">
                  <FinancialValue value={project.projectedMarginCents} />
                  <p className="text-muted mt-1 text-[0.6875rem] tabular-nums">
                    {project.forecastMarginPercent === null
                      ? "Margin unavailable"
                      : `${project.forecastMarginPercent.toFixed(1)}% forecast`}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <Schedule project={project} />
                </td>
                <td className="px-4 py-4">
                  <RiskScore project={project} />
                </td>
                <td className="px-4 py-4">
                  <p
                    title={project.aiSummary}
                    className="text-muted line-clamp-2 text-xs leading-5"
                  >
                    {project.aiSummary}
                  </p>
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-deep-green mt-1 inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    View project
                    <ArrowRight aria-hidden="true" className="size-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectCards({ projects }: { projects: readonly ProjectListView[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:hidden">
      {projects.map((project) => (
        <Card key={project.id} className="overflow-hidden p-0">
          <div className="bg-background relative h-32 overflow-hidden border-b">
            <Image
              src={project.imageUrl ?? fallbackImage}
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/65 to-transparent" />
            <div className="absolute top-3 right-3">
              <WatchlistButton item={watchlistItem(project)} />
            </div>
          </div>
          <div className="p-5">
            <p className="text-muted text-xs font-semibold">
              {project.number} · {project.location || "Location unavailable"}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{project.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <ProjectBadge kind={project.stage} />
              <ProjectBadge kind={project.health} />
            </div>
            <dl className="border-border mt-5 grid grid-cols-2 gap-4 border-y py-4">
              <Metric label="Forecast margin">
                <FinancialValue value={project.projectedMarginCents} />
              </Metric>
              <Metric label="Open risks">
                <span className="font-semibold tabular-nums">
                  {project.openRiskCount}
                </span>
              </Metric>
              <Metric label="Exposure">
                <FinancialValue value={project.exposureCents} />
              </Metric>
              <Metric label="Risk score">
                <span className="font-semibold tabular-nums">
                  {project.riskScore}/100
                </span>
              </Metric>
            </dl>
            <p className="text-muted mt-4 line-clamp-2 text-xs leading-5">
              {project.aiSummary}
            </p>
            <Link
              href={`/projects/${project.id}`}
              className="text-deep-green mt-4 inline-flex items-center gap-2 text-sm font-semibold"
            >
              View project <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  active: "bg-soft-green text-deep-green",
  planning: "bg-soft-blue text-info",
  complete: "bg-soft-blue text-info",
  completed: "bg-soft-blue text-info",
  on_hold: "bg-soft-amber text-warning",
  cancelled: "bg-background text-muted ring-1 ring-inset ring-border",
  on_track: "bg-soft-green text-deep-green",
  watch: "bg-soft-amber text-warning",
  at_risk: "bg-soft-red text-danger",
};

const badgeLabels: Record<string, string> = {
  active: "Active",
  planning: "Planning",
  complete: "Completed",
  completed: "Completed",
  on_hold: "On hold",
  cancelled: "Cancelled",
  on_track: "On track",
  watch: "Watch",
  at_risk: "At risk",
};

function ProjectBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold whitespace-nowrap ${
        badgeStyles[kind] ?? badgeStyles.cancelled
      }`}
    >
      <span
        aria-hidden="true"
        className="mr-1.5 size-1.5 rounded-full bg-current"
      />
      {badgeLabels[kind] ?? kind.replaceAll("_", " ")}
    </span>
  );
}

function FinancialValue({ value }: { value: number | null }) {
  return value === null ? (
    <span className="text-muted text-xs">Not available</span>
  ) : (
    <span className="font-semibold whitespace-nowrap tabular-nums">
      {formatMoney(value)}
    </span>
  );
}

function Schedule({ project }: { project: ProjectListView }) {
  const delayed = project.schedule === "delayed";
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${
          delayed ? "text-danger" : "text-deep-green"
        }`}
      >
        {delayed ? (
          <ArrowDownRight aria-hidden="true" className="size-3.5" />
        ) : project.schedule === "paused" ? (
          <Minus aria-hidden="true" className="size-3.5" />
        ) : (
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        )}
        {project.schedule.replaceAll("_", " ")}
      </span>
      <p className="text-muted mt-1 text-[0.6875rem]">
        {project.targetCompletionDate
          ? `Target ${new Intl.DateTimeFormat("en-US", {
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(`${project.targetCompletionDate}T00:00:00Z`))}`
          : "Target unavailable"}
      </p>
    </div>
  );
}

function RiskScore({ project }: { project: ProjectListView }) {
  const TrendIcon =
    project.riskTrend === "rising"
      ? ArrowUpRight
      : project.riskTrend === "improving"
        ? ArrowDownRight
        : Minus;
  const trendLabel =
    project.riskTrend === "insufficient" ? "No trend" : project.riskTrend;
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-semibold tabular-nums">{project.riskScore}</span>
        <span
          className="bg-border h-1.5 w-10 overflow-hidden rounded-full"
          role="img"
          aria-label={`Risk score ${project.riskScore} out of 100`}
        >
          <span
            className={`block h-full rounded-full ${
              project.riskScore >= 60
                ? "bg-status-high"
                : project.riskScore >= 30
                  ? "bg-status-medium"
                  : "bg-status-low"
            }`}
            style={{ width: `${project.riskScore}%` }}
          />
        </span>
      </div>
      <span className="text-muted mt-1 inline-flex items-center gap-1 text-[0.6875rem] capitalize">
        <TrendIcon aria-hidden="true" className="size-3" />
        {trendLabel}
      </span>
    </div>
  );
}

function watchlistItem(project: ProjectListView) {
  return {
    id: project.id,
    type: "project" as const,
    title: project.name,
    detail: `${project.number} · ${project.location}`,
    href: `/projects/${project.id}`,
  };
}
