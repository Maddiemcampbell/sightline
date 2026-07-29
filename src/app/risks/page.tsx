import Link from "next/link";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { RiskBadge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { formatMoney } from "@/features/daily-brief/formatters";
import { getResolutionValueSummary, getRisks } from "@/features/portfolio/data";
import { Pagination } from "@/features/portfolio/pagination-controls";
import { riskFiltersSchema } from "@/features/portfolio/validation";
import { WatchlistButton } from "@/features/workspace/watchlist-button";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RisksPage({ searchParams }: Props) {
  const filters = riskFiltersSchema.parse(await searchParams);
  const [result, valueSummary] = await Promise.all([
    getRisks(filters),
    getResolutionValueSummary(),
  ]);
  const risks = result.items;
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-muted text-sm font-semibold">Risk register</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Risks
        </h1>
        <p className="text-muted mt-2">
          Filter the issues that could reduce portfolio profit.
        </p>
      </header>
      <nav aria-label="Risk register views" className="mt-6 flex gap-2">
        {(["active", "resolved", "all"] as const).map((view) => (
          <Link
            key={view}
            href={`/risks?view=${view}`}
            aria-current={filters.view === view ? "page" : undefined}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${filters.view === view ? "bg-deep-green text-white" : "border-border bg-surface border"}`}
          >
            {view === "all"
              ? "All risks"
              : `${view[0]?.toUpperCase()}${view.slice(1)} risks`}
          </Link>
        ))}
      </nav>
      <section
        aria-label="Estimated resolution value"
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Risks resolved"
          value={String(valueSummary.risksResolved)}
        />
        <MetricCard
          label="Estimated exposure reduced"
          value={formatMoney(valueSummary.estimatedExposureReducedCents)}
        />
        <MetricCard
          label="Estimated loss avoided"
          value={formatMoney(valueSummary.estimatedLossAvoidedCents)}
        />
        <MetricCard
          label="Average time to resolution"
          value={`${valueSummary.averageResolutionHours} hours`}
        />
      </section>
      <p className="text-muted mt-2 text-xs">
        Financial totals are user-entered estimates and do not establish
        attribution to Sightline.
      </p>
      <form
        method="get"
        className="border-border bg-surface mt-7 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Risk filters"
      >
        <input type="hidden" name="view" value={filters.view} />
        <label className="relative sm:col-span-2">
          <span className="sr-only">Search risks</span>
          <Search className="text-muted absolute top-3 left-3 size-4" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search risks…"
            className="border-border h-10 w-full rounded-md border pr-3 pl-9 text-sm"
          />
        </label>
        <Select
          name="category"
          value={filters.category}
          label="Category"
          options={[
            "all",
            "insurance",
            "schedule",
            "documentation",
            "contract",
            "safety",
            "financial",
            "vendor",
            "weather",
            "other",
          ]}
        />
        <Select
          name="severity"
          value={filters.severity}
          label="Severity"
          options={["all", "low", "medium", "high", "critical"]}
        />
        <Select
          name="status"
          value={filters.status}
          label="Status"
          options={[
            "all",
            "monitoring",
            "action_needed",
            "in_progress",
            "resolved",
            "dismissed",
          ]}
        />
        <label className="relative">
          <span className="sr-only">Project name</span>
          <input
            name="project"
            defaultValue={filters.project === "all" ? "" : filters.project}
            placeholder="All projects"
            className="border-border h-10 w-full rounded-md border px-3 text-sm"
          />
        </label>
        <Select
          name="due"
          value={filters.due}
          label="Due date"
          options={["all", "overdue", "7_days", "30_days", "none"]}
        />
        <Select
          name="sort"
          value={filters.sort}
          label="Sort"
          options={["exposure", "confidence", "severity", "due", "detected"]}
        />
        <button className="bg-deep-green h-10 rounded-md px-5 text-sm font-semibold text-white xl:col-start-4">
          Apply filters
        </button>
      </form>
      <p className="text-muted mt-5 text-sm">
        {result.total} risk{result.total === 1 ? "" : "s"}
      </p>
      {risks.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No risks match"
            description="Adjust your filters to broaden the risk register."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {risks.map((risk) => (
            <Card key={risk.id} className="p-5">
              <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_8rem_9rem_8rem_auto]">
                <div>
                  <div className="mb-2 flex gap-2">
                    <RiskBadge
                      level={
                        risk.severity === "medium"
                          ? "medium"
                          : risk.severity === "low"
                            ? "low"
                            : "high"
                      }
                    >
                      {risk.severity}
                    </RiskBadge>
                    <StatusBadge
                      status={
                        risk.status === "resolved"
                          ? "complete"
                          : risk.status === "action_needed"
                            ? "pending"
                            : "neutral"
                      }
                    >
                      {risk.status.replace("_", " ")}
                    </StatusBadge>
                  </div>
                  <Link
                    href={`/risks/${risk.id}`}
                    className="hover:text-deep-green font-semibold"
                  >
                    {risk.title}
                  </Link>
                  <p className="text-muted mt-1 text-sm">
                    {risk.project?.name ?? "Unassigned"}
                  </p>
                </div>
                <Metric
                  label="Estimated exposure"
                  value={formatMoney(risk.potential_exposure_cents)}
                />
                <Metric
                  label="Confidence"
                  value={`${risk.confidence_score}%`}
                />
                <Metric
                  label="Due"
                  value={
                    risk.due_at
                      ? new Date(risk.due_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "None"
                  }
                />
                <Link
                  href={`/risks/${risk.id}`}
                  className="text-deep-green text-sm font-semibold"
                >
                  View risk →
                </Link>
                <WatchlistButton
                  item={{
                    id: risk.id,
                    type: "risk",
                    title: risk.title,
                    detail: risk.project?.name ?? "No project",
                    href: `/risks/${risk.id}`,
                  }}
                />
              </div>
            </Card>
          ))}
          <Pagination
            path="/risks"
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            parameters={filters}
          />
        </div>
      )}
    </div>
  );
}

function Select({
  name,
  value,
  label,
  options,
}: {
  name: string;
  value: string;
  label: string;
  options: readonly string[];
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="border-border h-10 w-full rounded-md border px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all"
              ? `All ${label.toLowerCase()}s`
              : option.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
