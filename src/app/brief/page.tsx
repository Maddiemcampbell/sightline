import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Database, FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { BriefSummary } from "@/features/daily-brief/brief-summary";
import {
  formatBriefDate,
  formatRelativeSync,
} from "@/features/daily-brief/formatters";
import { getDailyBriefView } from "@/features/daily-brief/data";
import { BriefRiskCard } from "@/features/daily-brief/risk-card";

export const metadata: Metadata = { title: "Daily Brief" };
export const dynamic = "force-dynamic";

export default async function BriefPage() {
  const brief = await getDailyBriefView();

  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header className="mb-8 max-w-3xl">
        <p className="text-muted text-sm font-semibold">
          {brief ? formatBriefDate(brief.briefDate) : "Daily Brief"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Good morning, Matt.
        </h1>
        <p className="text-muted mt-3 text-base leading-7 sm:text-lg">
          Here are the three things most likely to cost you money this week.
        </p>
      </header>

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

          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <section aria-label="Prioritized risks" className="min-w-0">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                    Daily Brief
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                    Executive attention required
                  </h2>
                </div>
                <span className="text-muted text-sm">
                  {brief.risks.length} of 3 issues
                </span>
              </div>
              {brief.risks.length === 0 ? (
                <EmptyState
                  title="No active risks in today’s brief"
                  description="All prioritized risks have been resolved or dismissed."
                />
              ) : (
                <div className="space-y-5">
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
                  {brief.risks.map((risk) => (
                    <BriefRiskCard
                      key={risk.id}
                      risk={risk}
                      actionOwners={brief.actionOwners}
                    />
                  ))}
                </div>
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
