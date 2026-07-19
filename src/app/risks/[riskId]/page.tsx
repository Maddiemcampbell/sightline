import { notFound } from "next/navigation";
import Link from "next/link";

import { RiskBadge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/daily-brief/formatters";
import { getRiskDetail } from "@/features/portfolio/data";
import { RiskDetailActions } from "@/features/portfolio/risk-detail-actions";
import { ActionPanel } from "@/features/actions/action-panel";
import { toActionView } from "@/features/actions/data";
import { getActivityPage } from "@/features/activity/data";
import { ActivityTimeline } from "@/features/activity/timeline";
import { RiskCommentForm } from "@/features/activity/comment-form";
import { getRiskEvidenceExperience } from "@/features/evidence/data";
import { EvidenceExperience } from "@/features/evidence/evidence-experience";
import { getAskSightlineHistory } from "@/features/ask-sightline/data";
import { AskSightlinePanel } from "@/features/ask-sightline/ask-panel";
import type { RiskResolutionRow } from "@/lib/supabase/database-row.types";

type Props = {
  params: Promise<{ riskId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function RiskPage({ params, searchParams }: Props) {
  const { riskId } = await params;
  const { tab } = await searchParams;
  const detail = await getRiskDetail(riskId);
  if (!detail) notFound();
  const [activityPage, evidenceExperience, askMessages] = await Promise.all([
    getActivityPage({ riskId, limit: 30 }),
    getRiskEvidenceExperience(riskId),
    tab === "ask" ? getAskSightlineHistory(riskId) : Promise.resolve([]),
  ]);
  const activeTab = tab === "evidence" || tab === "ask" ? tab : "overview";
  const closed = ["resolved", "dismissed"].includes(detail.risk.status);
  const ownerNameById = new Map(
    detail.users.map((user) => [user.id, user.full_name]),
  );
  const actionOwners = detail.users.map((user) => ({
    id: user.id,
    name: user.full_name,
  }));
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <Link href="/risks" className="text-muted text-sm font-semibold">
        ← Risk register
      </Link>
      <header className="mt-5 max-w-4xl">
        <div className="flex flex-wrap gap-2">
          <RiskBadge
            level={
              detail.risk.severity === "medium"
                ? "medium"
                : detail.risk.severity === "low"
                  ? "low"
                  : "high"
            }
          >
            {detail.risk.severity}
          </RiskBadge>
          <StatusBadge
            status={
              detail.risk.status === "resolved"
                ? "complete"
                : detail.risk.status === "action_needed"
                  ? "pending"
                  : "neutral"
            }
          >
            {detail.risk.status.replace("_", " ")}
          </StatusBadge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          {detail.risk.title}
        </h1>
        <p className="text-muted mt-3 leading-7">{detail.risk.summary}</p>
      </header>
      <RiskDetailActions
        riskId={riskId}
        ownerId={detail.risk.assigned_user_id}
        dueAt={detail.risk.due_at}
        users={detail.users}
        actions={detail.actions}
        exposureCents={detail.risk.potential_exposure_cents}
        status={detail.risk.status}
        closed={closed}
      />
      <Link
        href={`/risks/${riskId}/email-draft`}
        className="border-border bg-surface text-ink hover:bg-background mt-4 inline-flex min-h-10 items-center rounded-md border px-4 py-2 text-sm font-semibold"
      >
        Draft email
      </Link>
      <section
        aria-label="Risk summary"
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          label="Potential exposure"
          value={formatMoney(detail.risk.potential_exposure_cents)}
        />
        <Metric label="Confidence" value={`${detail.risk.confidence_score}%`} />
        <Metric label="Owner" value={detail.owner?.full_name ?? "Unassigned"} />
        <Metric
          label="Due date"
          value={
            detail.risk.due_at
              ? new Date(detail.risk.due_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not set"
          }
        />
      </section>
      {detail.risk.status === "resolved" && detail.resolutions[0] && (
        <ResolutionSummary
          resolution={detail.resolutions[0]}
          ownerName={
            ownerNameById.get(detail.resolutions[0].final_owner_user_id) ??
            "Unknown owner"
          }
          actionTitles={detail.actions
            .filter((action) =>
              detail.resolutions[0]?.completed_action_ids.includes(action.id),
            )
            .map((action) => action.title)}
        />
      )}
      <nav
        aria-label="Risk detail sections"
        className="border-border mt-7 border-b"
      >
        <div className="flex gap-6">
          <TabLink href={`/risks/${riskId}`} active={activeTab === "overview"}>
            Overview
          </TabLink>
          <TabLink
            href={`/risks/${riskId}?tab=evidence`}
            active={activeTab === "evidence"}
          >
            Evidence ({evidenceExperience.items.length})
          </TabLink>
          <TabLink
            href={`/risks/${riskId}?tab=ask`}
            active={activeTab === "ask"}
          >
            Ask Sightline
          </TabLink>
        </div>
      </nav>
      {activeTab === "ask" ? (
        <div className="mt-6">
          <AskSightlinePanel
            riskId={riskId}
            initialMessages={askMessages}
            evidenceLabels={Object.fromEntries(
              evidenceExperience.items.map((item) => [item.id, item.title]),
            )}
          />
        </div>
      ) : activeTab === "evidence" ? (
        <div className="mt-6">
          <EvidenceExperience experience={evidenceExperience} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Panel title="Why it matters">
              <p className="leading-7">{detail.risk.why_it_matters}</p>
            </Panel>
            <Panel title="Evidence">
              <p className="text-muted text-sm leading-6">
                {evidenceExperience.items.length} cited source
                {evidenceExperience.items.length === 1 ? "" : "s"} support this
                risk.
              </p>
              <Link
                href={`/risks/${riskId}?tab=evidence`}
                className="text-deep-green mt-4 inline-block text-sm font-semibold"
              >
                Review why Sightline believes this →
              </Link>
            </Panel>
            <Panel title="Recommended actions">
              <ActionPanel
                actions={detail.actions.map((action) =>
                  toActionView(
                    action,
                    action.owner_user_id
                      ? (ownerNameById.get(action.owner_user_id) ?? null)
                      : null,
                  ),
                )}
                owners={actionOwners}
              />
            </Panel>
          </div>
          <aside className="space-y-6">
            <Panel title="Related project">
              {detail.project ? (
                <>
                  <Link
                    href={`/projects/${detail.project.id}`}
                    className="hover:text-deep-green font-semibold"
                  >
                    {detail.project.name}
                  </Link>
                  <p className="text-muted mt-1 text-sm">
                    {detail.project.project_number} · {detail.project.city},{" "}
                    {detail.project.state_code}
                  </p>
                </>
              ) : (
                <p className="text-muted text-sm">No project assigned.</p>
              )}
            </Panel>
            <Panel title="Related vendor">
              {detail.vendor ? (
                <>
                  <p className="font-semibold">{detail.vendor.name}</p>
                  <p className="text-muted mt-1 text-sm">
                    {detail.vendor.trade ?? "Trade not set"}
                  </p>
                </>
              ) : (
                <p className="text-muted text-sm">No vendor assigned.</p>
              )}
            </Panel>
            <Panel title="Activity timeline">
              <RiskCommentForm riskId={riskId} users={detail.users} />
              <ActivityTimeline items={activityPage.items} condensed />
              {activityPage.nextCursor && (
                <Link
                  href={`/activity?riskId=${riskId}`}
                  className="text-deep-green mt-5 inline-block text-sm font-semibold"
                >
                  View complete history
                </Link>
              )}
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`border-b-2 px-1 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "border-deep-green text-deep-green" : "text-muted border-transparent"}`}
    >
      {children}
    </Link>
  );
}
function ResolutionSummary({
  resolution,
  ownerName,
  actionTitles,
}: {
  resolution: RiskResolutionRow;
  ownerName: string;
  actionTitles: readonly string[];
}) {
  return (
    <Card className="border-deep-green/20 bg-soft-green mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-deep-green text-xs font-semibold uppercase">
            Resolution summary
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {resolution.resolution_type.replaceAll("_", " ")}
          </h2>
        </div>
        <p className="text-muted text-sm">
          Resolved{" "}
          {new Date(
            `${resolution.resolved_date}T12:00:00`,
          ).toLocaleDateString()}
        </p>
      </div>
      <p className="mt-4 leading-7">{resolution.summary}</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResolutionFact label="Final owner" value={ownerName} />
        <ResolutionFact
          label="Estimated exposure before"
          value={formatMoney(resolution.exposure_before_cents)}
        />
        <ResolutionFact
          label="Estimated remaining exposure"
          value={formatMoney(resolution.remaining_exposure_cents)}
        />
        <ResolutionFact
          label="Estimated loss avoided"
          value={formatMoney(resolution.estimated_loss_avoided_cents)}
        />
        <ResolutionFact
          label="Sightline warning useful"
          value={resolution.warning_useful ? "Yes" : "No"}
        />
        <ResolutionFact
          label="Original prediction accurate"
          value={resolution.prediction_accurate ? "Yes" : "No"}
        />
      </dl>
      <div className="mt-5 border-t pt-4">
        <p className="text-muted text-xs font-semibold uppercase">
          Actions completed
        </p>
        <p className="mt-2 text-sm">
          {actionTitles.length ? actionTitles.join(" · ") : "None recorded"}
        </p>
      </div>
      {resolution.internal_notes && (
        <div className="mt-4 border-t pt-4">
          <p className="text-muted text-xs font-semibold uppercase">
            Internal notes
          </p>
          <p className="mt-2 text-sm leading-6">{resolution.internal_notes}</p>
        </div>
      )}
      <p className="text-muted mt-5 text-xs leading-5">
        All financial figures are estimates. Warning usefulness is user
        feedback, not proof that Sightline caused the outcome.
      </p>
    </Card>
  );
}
function ResolutionFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-muted text-xs font-semibold uppercase">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </Card>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}
