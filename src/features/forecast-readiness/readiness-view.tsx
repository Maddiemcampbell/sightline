import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Database,
  Link2,
  PlugZap,
  RefreshCw,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import type {
  ForecastReadinessCenter,
  ProjectReadiness,
} from "@/features/forecast-readiness/types";

export function ForecastReadinessView({
  center,
}: {
  center: ForecastReadinessCenter;
}) {
  return (
    <div className="mx-auto max-w-[96rem] space-y-6 px-[var(--page-gutter)] py-6 sm:py-8">
      <header className="rounded-2xl bg-[#f4f7ed] px-5 py-6 sm:px-8 sm:py-8">
        <Link
          href="/forecasts"
          className="text-deep-green inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Forecasting
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-deep-green text-xs font-semibold tracking-[0.12em] uppercase">
              Forecast confidence
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Data-readiness center
            </h1>
            <p className="text-muted mt-3 max-w-2xl leading-6">
              Understand which forecasts are decision-ready, which values are
              estimated, and exactly what to fix before relying on the outlook.
            </p>
          </div>
          <div className="border-border bg-surface min-w-44 rounded-xl border p-4">
            <p className="text-muted text-xs">Portfolio readiness</p>
            <p className="mt-1 text-3xl font-semibold">
              {center.canViewFinancials ? `${center.score}%` : "—"}
            </p>
            {center.canViewFinancials ? (
              <ConfidenceBadge value={center.confidence} />
            ) : (
              <span className="text-muted mt-1 block text-xs font-semibold">
                Restricted for your role
              </span>
            )}
          </div>
        </div>
      </header>

      {!center.canViewFinancials ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <CircleHelp
              className="mt-0.5 size-5 shrink-0 text-amber-800"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-semibold">
                Financial readiness is restricted
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Your role can see whether schedule inputs are present, but
                financial completeness, freshness, and estimated-value details
                require financial access.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {center.canViewFinancials ? (
        <section
          aria-label="Readiness summary"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        >
          <SummaryCard
            label="Decision-ready"
            value={`${center.summary.readyProjects}/${center.projects.length}`}
            detail="Projects with high confidence"
          />
          <SummaryCard
            label="Missing inputs"
            value={String(center.summary.projectsWithMissingInputs)}
            detail="Projects needing required fields"
            warning={center.summary.projectsWithMissingInputs > 0}
          />
          <SummaryCard
            label="Stale records"
            value={String(center.summary.staleProjects)}
            detail={`Older than ${center.staleAfterDays} days`}
            warning={center.summary.staleProjects > 0}
          />
          <SummaryCard
            label="Authoritative values"
            value={String(center.summary.authoritativeValues)}
            detail="Direct project inputs available"
          />
          <SummaryCard
            label="Estimated values"
            value={String(center.summary.estimatedValues)}
            detail="Forecast assumptions in use"
            warning={center.summary.estimatedValues > 0}
          />
        </section>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        {center.canViewFinancials || center.recommendations.length ? (
          <Recommendations center={center} />
        ) : null}
        <IntegrationHealth center={center} />
      </div>

      {center.canViewFinancials ? (
        <section
          id="project-readiness"
          aria-labelledby="project-readiness-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-deep-green text-xs font-semibold tracking-[0.1em] uppercase">
                Project confidence
              </p>
              <h2
                id="project-readiness-heading"
                className="mt-1 text-xl font-semibold"
              >
                Readiness by project
              </h2>
              <p className="text-muted mt-1 text-sm">
                Lowest-confidence projects appear first. Scores reflect required
                inputs, freshness, and reliance on estimated cash timing.
              </p>
            </div>
            <p className="text-muted text-xs">
              Assessed {formatDateTime(center.generatedAt)}
            </p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {center.projects.map((project) => (
              <ProjectReadinessCard key={project.id} project={project} />
            ))}
          </div>
          {!center.projects.length ? (
            <Card className="mt-4">
              <p className="text-muted text-sm">
                No accessible active projects are available to assess.
              </p>
            </Card>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Recommendations({ center }: { center: ForecastReadinessCenter }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="bg-soft-green text-deep-green grid size-10 place-items-center rounded-lg">
          <RefreshCw className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Improve forecast accuracy</h2>
          <p className="text-muted mt-1 text-sm">
            Prioritized steps based on the gaps Sightline can verify now.
          </p>
        </div>
      </div>
      {center.recommendations.length ? (
        <ol className="mt-5 divide-y">
          {center.recommendations.map((item, index) => (
            <li key={item.title}>
              <Link href={item.href} className="flex items-start gap-3 py-4">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${item.priority === "high" ? "bg-soft-red text-danger" : "bg-amber-100 text-amber-800"}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="text-muted mt-1 block text-sm leading-5">
                    {item.detail}
                  </span>
                </span>
                <ArrowRight
                  className="text-muted mt-1 size-4 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="bg-soft-green text-deep-green mt-5 flex items-center gap-2 rounded-lg p-4 text-sm font-semibold">
          <CheckCircle2 className="size-5" aria-hidden="true" /> No material
          readiness gaps detected.
        </p>
      )}
    </Card>
  );
}

function IntegrationHealth({ center }: { center: ForecastReadinessCenter }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-deep-green text-xs font-semibold tracking-[0.1em] uppercase">
            Source health
          </p>
          <h2 className="mt-1 text-lg font-semibold">Integration readiness</h2>
        </div>
        <PlugZap className="text-deep-green size-5" aria-hidden="true" />
      </div>
      {center.canManageIntegrations ? (
        <>
          <ul className="mt-5 space-y-3">
            {center.integrations.map((connection) => (
              <li
                key={connection.id}
                className="border-border rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {providerLabel(connection.provider)}
                    </p>
                    <p className="text-muted mt-1 text-xs">{connection.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${connection.stale || connection.status !== "active" ? "bg-amber-100 text-amber-800" : "bg-soft-green text-deep-green"}`}
                  >
                    {connection.stale
                      ? "Stale"
                      : connection.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-muted mt-2 text-xs">
                  {connection.lastSuccessfulSyncAt
                    ? `Last successful sync ${formatDateTime(connection.lastSuccessfulSyncAt)}`
                    : "No successful synchronization recorded"}
                </p>
              </li>
            ))}
          </ul>
          {!center.integrations.length ? (
            <p className="text-muted mt-5 text-sm">
              No external data sources are connected. Manual inputs can still be
              authoritative when complete and current.
            </p>
          ) : null}
          <dl className="border-border mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center">
            <MappingMetric
              label="Discovered"
              value={center.mapping.discoveredObjects}
            />
            <MappingMetric
              label="Mapped"
              value={center.mapping.mappedObjects}
            />
            <MappingMetric
              label="Unmapped"
              value={center.mapping.unmappedObjects}
              warning={center.mapping.unmappedObjects > 0}
            />
          </dl>
          <Link
            href="/integrations"
            className="text-deep-green mt-5 inline-flex items-center gap-2 text-sm font-semibold"
          >
            Manage data sources{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </>
      ) : (
        <p className="text-muted mt-5 text-sm leading-6">
          Integration health and object mapping are available to organization
          members who manage connected data sources.
        </p>
      )}
    </Card>
  );
}

function ProjectReadinessCard({ project }: { project: ProjectReadiness }) {
  const healthy = project.confidence === "high";
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/projects/${project.id}`}
              className="font-semibold hover:underline"
            >
              {project.name}
            </Link>
            <p className="text-muted mt-1 text-xs">
              {project.dataAsOfDate
                ? `Financial data as of ${formatDate(project.dataAsOfDate)}`
                : "No financial as-of date"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold">{project.score}%</p>
            <ConfidenceBadge value={project.confidence} />
          </div>
        </div>
        <div
          className="bg-background mt-4 h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-label={`${project.name} readiness`}
          aria-valuenow={project.score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full ${healthy ? "bg-deep-green" : project.confidence === "medium" ? "bg-amber-500" : "bg-danger"}`}
            style={{ width: `${project.score}%` }}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Metric
            icon={<Database className="size-4" aria-hidden="true" />}
            label="Authoritative"
            value={`${project.authoritativeValues}/${project.expectedValues} inputs`}
          />
          <Metric
            icon={<Link2 className="size-4" aria-hidden="true" />}
            label="Connected sources"
            value={project.connectedSources.join(", ") || "Manual data"}
          />
        </dl>
      </div>
      <details className="group border-border border-t">
        <summary className="text-deep-green flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {project.recommendations.length
            ? `${project.recommendations.length} step${project.recommendations.length === 1 ? "" : "s"} to improve confidence`
            : "Review confidence details"}
          <span aria-hidden="true" className="group-open:rotate-90">
            →
          </span>
        </summary>
        <div className="bg-background space-y-4 px-5 py-4 text-sm">
          <InputList title="Missing inputs" items={project.missingInputs} />
          <InputList title="Estimated values" items={project.estimatedValues} />
          {project.recommendations.length ? (
            <ul className="space-y-3">
              {project.recommendations.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-deep-green font-semibold"
                  >
                    {item.label} →
                  </Link>
                  <p className="text-muted mt-1 text-xs leading-5">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-deep-green flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Required
              inputs are complete, current, and authoritative.
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-muted text-xs font-semibold uppercase">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${warning ? "text-danger" : ""}`}
      >
        {value}
      </p>
      <p className="text-muted mt-2 text-xs leading-5">{detail}</p>
    </Card>
  );
}

function ConfidenceBadge({ value }: { value: string }) {
  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${value === "high" ? "bg-soft-green text-deep-green" : value === "medium" ? "bg-amber-100 text-amber-800" : "bg-soft-red text-danger"}`}
    >
      {value} confidence
    </span>
  );
}

function MappingMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className={`mt-1 font-semibold ${warning ? "text-danger" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-border rounded-lg border p-3">
      <dt className="text-muted flex items-center gap-2 text-xs">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 font-semibold">{value}</dd>
    </div>
  );
}

function InputList({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <ul className="text-muted mt-2 space-y-1 text-xs">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <AlertTriangle
              className="size-3.5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function providerLabel(provider: string) {
  if (provider === "sharepoint") return "Microsoft 365 / SharePoint";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
