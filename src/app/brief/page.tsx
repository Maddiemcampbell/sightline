import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  Database,
  FolderKanban,
  ShieldAlert,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { BriefSummary } from "@/features/daily-brief/brief-summary";
import {
  formatBriefDate,
  formatRelativeSync,
} from "@/features/daily-brief/formatters";
import { getDailyBriefView } from "@/features/daily-brief/data";
import { BriefRiskCard } from "@/features/daily-brief/risk-card";
import { V2Walkthrough } from "@/features/onboarding/v2-walkthrough";

export const metadata: Metadata = { title: "Daily Brief" };
export const dynamic = "force-dynamic";

export default async function BriefPage() {
  const brief = await getDailyBriefView();
  const actToday = brief?.risks.filter((risk) => !risk.acknowledged) ?? [];
  const monitor = brief?.risks.filter((risk) => risk.acknowledged) ?? [];
  const inProgress =
    brief?.risks.filter((risk) => risk.primaryAction?.status === "in_progress")
      .length ?? 0;
  const reviewed = brief?.risks.filter((risk) => risk.acknowledged).length ?? 0;

  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-deep-green text-xs font-semibold tracking-[0.1em] uppercase">
              Today&apos;s decisions
            </p>
            <span className="text-muted text-xs">·</span>
            <p className="text-muted text-xs font-medium">
              {brief ? formatBriefDate(brief.briefDate) : "Daily Brief"}
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Good morning, Matt.
          </h1>
          <p className="text-muted mt-3 text-base leading-7 sm:text-lg">
            {brief?.risks.length
              ? `${actToday.length} ${actToday.length === 1 ? "issue needs" : "issues need"} a decision today. ${monitor.length} ${monitor.length === 1 ? "item is" : "items are"} acknowledged and being monitored.`
              : "Your brief brings today’s supported decisions into one focused review."}
          </p>
        </div>
        <Link
          href="/"
          className="border-border bg-surface hover:bg-background inline-flex min-h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold"
        >
          Back to portfolio home
        </Link>
      </header>

      <V2Walkthrough />

      {!brief ? (
        <EmptyState
          title="No brief is ready yet"
          description="Sightline will show prioritized profit risks here when a published daily brief is available."
        />
      ) : (
        <>
          <BriefSummary
            totalProfitAtRiskCents={brief.totalProfitAtRiskCents}
            activeProjectCount={brief.activeProjectCount}
            openRiskCount={brief.openRiskCount}
            overallRiskLevel={brief.overallRiskLevel}
          />

          <Card className="mb-7 p-0">
            <div className="grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="p-5 sm:p-6">
                <p className="text-deep-green text-xs font-semibold tracking-[0.09em] uppercase">
                  Review progress
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {reviewed === brief.risks.length && brief.risks.length
                    ? "Today’s brief is reviewed"
                    : `${brief.risks.length - reviewed} ${brief.risks.length - reviewed === 1 ? "decision" : "decisions"} remaining`}
                </h2>
                <p className="text-muted mt-2 text-sm leading-6">
                  {reviewed} acknowledged · {inProgress} actions in progress ·{" "}
                  {brief.recentResolutions.length} recently resolved
                </p>
              </div>
              <div className="border-border min-w-64 border-t p-5 sm:p-6 md:border-t-0 md:border-l">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Reviewed</span>
                  <span className="font-semibold">
                    {reviewed} of {brief.risks.length}
                  </span>
                </div>
                <div className="bg-background mt-2 h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-deep-green h-full rounded-full"
                    style={{
                      width: `${brief.risks.length ? (reviewed / brief.risks.length) * 100 : 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <section
              aria-label="Prioritized risks"
              className="min-w-0 space-y-9"
            >
              {brief.risks.length === 0 ? (
                <EmptyState
                  title="No active risks in today’s brief"
                  description="All prioritized risks have been resolved or dismissed."
                />
              ) : (
                <>
                  {brief.risks.length < 3 && (
                    <div
                      role="status"
                      className="border-border bg-soft-amber text-warning rounded-lg border px-4 py-3 text-sm"
                    >
                      Only {brief.risks.length} qualifying{" "}
                      {brief.risks.length === 1 ? "risk is" : "risks are"}{" "}
                      available. Sightline will add items as evidence becomes
                      sufficient.
                    </div>
                  )}
                  {actToday.length ? (
                    <BriefGroup
                      title="Act today"
                      description="Unreviewed items that need an accountable decision or response."
                      count={actToday.length}
                      icon={
                        <ShieldAlert
                          className="text-danger size-5"
                          aria-hidden="true"
                        />
                      }
                    >
                      {actToday.map((risk) => (
                        <BriefRiskCard
                          key={risk.id}
                          risk={risk}
                          actionOwners={brief.actionOwners}
                          attentionState="act"
                        />
                      ))}
                    </BriefGroup>
                  ) : (
                    <Card className="flex items-center gap-3 p-5">
                      <CheckCircle2
                        className="text-deep-green size-5"
                        aria-hidden="true"
                      />
                      <div>
                        <h2 className="font-semibold">
                          Nothing left to review today
                        </h2>
                        <p className="text-muted mt-1 text-sm">
                          All current brief items have been acknowledged.
                        </p>
                      </div>
                    </Card>
                  )}
                  {monitor.length ? (
                    <BriefGroup
                      title="Monitor"
                      description="Acknowledged items that remain active or have work underway."
                      count={monitor.length}
                      icon={
                        <CircleDot
                          className="text-warning size-5"
                          aria-hidden="true"
                        />
                      }
                    >
                      {monitor.map((risk) => (
                        <BriefRiskCard
                          key={risk.id}
                          risk={risk}
                          actionOwners={brief.actionOwners}
                          attentionState="monitor"
                        />
                      ))}
                    </BriefGroup>
                  ) : null}
                </>
              )}
            </section>

            <aside
              aria-label="Brief context"
              className="space-y-5 xl:sticky xl:top-24"
            >
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <FolderKanban className="text-deep-green size-4" />
                  <h2 className="font-semibold">Projects at a glance</h2>
                </div>
                <ul className="mt-4 divide-y">
                  {brief.projects.map((project) => (
                    <li key={project.id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        href={`/projects/${project.id}`}
                        className="hover:text-deep-green block text-sm font-semibold"
                      >
                        {project.name}
                      </Link>
                      <div className="text-muted mt-1 flex justify-between gap-3 text-xs">
                        <span>{project.location}</span>
                        <span>{project.openRiskCount} open</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-deep-green size-4" />
                  <h2 className="font-semibold">Recent resolutions</h2>
                </div>
                {brief.recentResolutions.length ? (
                  <ul className="mt-4 space-y-4">
                    {brief.recentResolutions.map((resolution) => (
                      <li key={resolution.id}>
                        <Link
                          href={`/risks/${resolution.id}`}
                          className="hover:text-deep-green text-sm leading-5 font-semibold"
                        >
                          {resolution.title}
                        </Link>
                        <p className="text-muted mt-1 text-xs">
                          {resolution.projectName}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted mt-4 text-sm">
                    No recent resolutions.
                  </p>
                )}
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <Database className="text-deep-green size-4" />
                  <h2 className="font-semibold">Connected data sources</h2>
                </div>
                <ul className="mt-4 space-y-4">
                  {brief.sources.map((source) => (
                    <li key={source.id}>
                      <p className="text-sm font-semibold">{source.name}</p>
                      <p className="text-muted mt-1 text-xs">
                        {formatRelativeSync(source.lastSyncedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function BriefGroup({
  title,
  description,
  count,
  icon,
  children,
}: {
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`brief-${title.toLowerCase().replaceAll(" ", "-")}`}
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="bg-background grid size-9 place-items-center rounded-md">
            {icon}
          </span>
          <div>
            <h2
              id={`brief-${title.toLowerCase().replaceAll(" ", "-")}`}
              className="text-xl font-semibold tracking-[-0.025em]"
            >
              {title}
            </h2>
            <p className="text-muted mt-1 text-sm">{description}</p>
          </div>
        </div>
        <span className="text-muted shrink-0 text-sm">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
