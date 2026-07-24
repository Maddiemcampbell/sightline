import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CircleUserRound,
  Clock3,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";

import { ActionControls } from "@/features/actions/action-controls";
import { ActivityTimeline } from "@/features/activity/timeline";
import { PortfolioHealth } from "@/features/dashboard/portfolio-health";
import type {
  Comparison,
  DashboardView,
  PriorityItem,
} from "@/features/dashboard/types";
import { formatMoney } from "@/features/daily-brief/formatters";
import { Card } from "@/components/ui/card";
import type { PortfolioObservation } from "@/features/portfolio-intelligence/types";

export function Dashboard({ view }: { view: DashboardView }) {
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
        <header>
          <p className="text-deep-green text-sm font-semibold">{date}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Good morning, {firstName}.
          </h1>
        </header>
        <Card className="mt-8 py-14 text-center">
          <h2 className="text-xl font-semibold">Your portfolio is ready</h2>
          <p className="text-muted mx-auto mt-2 max-w-lg text-sm leading-6">
            Connect or add a project to begin seeing organization-level risks,
            actions, activity, and conservative value estimates here.
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

  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-8 lg:py-10">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-deep-green text-sm font-semibold">{date}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Good morning, {firstName}.
          </h1>
          <p className="text-muted mt-3 text-base">
            Here’s what changed and what needs your attention.
          </p>
        </div>
        <Link
          href="/brief"
          className="border-border bg-surface text-deep-green hover:bg-background inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-md border px-4 text-sm font-semibold"
        >
          Open Daily Brief
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <Section
        title="Portfolio observations"
        description="Deterministic patterns across projects, risks, documents, vendors, and actions. No model-generated guesses."
        className="mt-9"
      >
        {view.observations.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {view.observations.slice(0, 4).map((observation) => (
              <ObservationCard
                key={observation.key}
                observation={observation}
              />
            ))}
          </div>
        ) : (
          <Card className="mt-4">
            <p className="text-muted text-sm">
              No cross-project pattern currently meets Sightline’s deterministic
              observation thresholds.
            </p>
          </Card>
        )}
      </Section>

      <Section
        title="Overnight summary"
        description="A compact view of movement since the start of today."
        className="mt-9"
      >
        <div className="border-border bg-surface shadow-surface grid overflow-hidden rounded-lg border sm:grid-cols-2 xl:grid-cols-5">
          <SummaryMetric
            label="New risks detected"
            comparison={view.overnight.newRisks}
            href="/risks?sort=detected"
          />
          <SummaryMetric
            label="Risks resolved"
            comparison={view.overnight.resolvedRisks}
            href="/risks?view=resolved"
          />
          <SummaryMetric
            label="Actions overdue"
            comparison={view.overnight.overdueActions}
            href="/actions?due=overdue"
          />
          <SummaryMetric
            label="Awaiting you"
            comparison={view.overnight.awaitingUser}
            href={`/actions?owner=${view.owners.find((owner) => owner.name === view.currentUserName)?.id ?? "all"}`}
          />
          <SummaryMetric
            label="Estimated exposure change"
            comparison={view.overnight.exposureDeltaCents}
            href="/risks"
            money
          />
        </div>
      </Section>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(21rem,0.75fr)]">
        <Section
          title="Today’s priorities"
          description="Ranked deterministically by severity, estimated exposure, urgency, ownership, escalation, confidence, and status."
        >
          <Card className="mt-4 p-0">
            {view.priorities.length ? (
              <ol>
                {view.priorities.map((priority, index) => (
                  <PriorityRow
                    key={priority.id}
                    item={priority}
                    rank={index + 1}
                  />
                ))}
              </ol>
            ) : (
              <NoActiveRisks />
            )}
          </Card>
        </Section>

        <Section
          title="Recent activity"
          description="Meaningful decisions and system events across the company."
          action={
            <Link
              href="/activity"
              className="text-deep-green text-sm font-semibold hover:underline"
            >
              View all
            </Link>
          }
        >
          <Card className="mt-4">
            {view.activity.length ? (
              <ActivityTimeline items={view.activity} condensed />
            ) : (
              <p className="text-muted py-6 text-sm">
                No recent activity has been recorded.
              </p>
            )}
          </Card>
        </Section>
      </div>

      <Section
        title="Portfolio health"
        description="Active projects ordered by current margin concern."
        className="mt-10"
      >
        <Card className="mt-4 overflow-hidden">
          <PortfolioHealth projects={view.portfolio} />
        </Card>
      </Section>

      <Section
        title="Work in motion"
        description="Operational follow-through already managed through Sightline actions and risks."
        className="mt-10"
      >
        <WorkInMotion view={view} />
      </Section>

      <Section
        title="Value delivered"
        description="Conservative measures associated with resolved risks this month."
        className="mt-10"
      >
        <ValueDelivered value={view.value} />
      </Section>
    </div>
  );
}

function ObservationCard({
  observation,
}: {
  observation: PortfolioObservation;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="bg-soft-green text-deep-green grid size-9 shrink-0 place-items-center rounded-full">
            <Lightbulb className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-muted text-xs font-semibold uppercase">
              Deterministic observation
            </p>
            <h3 className="mt-1 leading-6 font-semibold">
              {observation.title}
            </h3>
          </div>
        </div>
        <span className="bg-background shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
          {observation.confidence}% confidence
        </span>
      </div>
      <p className="text-muted mt-4 text-sm leading-6">{observation.summary}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted text-xs font-semibold uppercase">
            Affected projects
          </dt>
          <dd className="mt-1">
            {observation.affectedProjects.map((project, index) => (
              <span key={project.id}>
                {index > 0 ? ", " : ""}
                <Link
                  href={`/projects/${project.id}`}
                  className="text-deep-green font-semibold"
                >
                  {project.name}
                </Link>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-xs font-semibold uppercase">
            Business impact
          </dt>
          <dd className="mt-1 font-semibold">
            {observation.businessImpactEstimateCents === null
              ? "Not estimated"
              : `${formatMoney(observation.businessImpactEstimateCents)} current exposure`}
          </dd>
        </div>
      </dl>
      <details className="border-border mt-4 border-t pt-4">
        <summary className="text-deep-green cursor-pointer text-sm font-semibold">
          Review supporting evidence
        </summary>
        <ul className="text-muted mt-3 space-y-2 text-sm">
          {observation.supportingEvidence.map((item) => (
            <li key={`${item.entityType}:${item.entityId}`}>
              <strong className="text-ink">{item.label}:</strong> {item.value}
            </li>
          ))}
        </ul>
        <p className="text-muted mt-3 text-xs">
          {observation.businessImpactExplanation}
        </p>
      </details>
      <div className="bg-background mt-4 rounded-md p-3 text-sm">
        <strong>Recommended next step:</strong>{" "}
        {observation.recommendedNextStep}
      </div>
    </Card>
  );
}

function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className} aria-labelledby={slug(title)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={slug(title)} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-muted mt-1 text-sm">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryMetric({
  label,
  comparison,
  href,
  money = false,
}: {
  label: string;
  comparison: Comparison;
  href: string;
  money?: boolean;
}) {
  const value = money
    ? `${comparison.value > 0 ? "+" : ""}${formatMoney(comparison.value)}`
    : comparison.value.toLocaleString();
  const delta =
    comparison.previousValue === null
      ? null
      : comparison.value - comparison.previousValue;
  return (
    <Link
      href={href}
      className="border-border group hover:bg-background min-h-36 border-b p-5 last:border-b-0 xl:border-r xl:border-b-0 xl:last:border-r-0 sm:[&:nth-last-child(-n+1)]:border-b-0"
    >
      <p className="text-muted text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted mt-2 text-xs">
        {delta === null
          ? "No prior-day history"
          : delta === 0
            ? "No change from yesterday"
            : `${delta > 0 ? "+" : ""}${money ? formatMoney(delta) : delta} vs. yesterday`}
      </p>
    </Link>
  );
}

function PriorityRow({ item, rank }: { item: PriorityItem; rank: number }) {
  return (
    <li className="border-border grid gap-4 border-b p-5 last:border-b-0 md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-center">
      <span className="bg-soft-green text-deep-green grid size-8 place-items-center rounded-full text-sm font-semibold">
        {rank}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-deep-green text-xs font-semibold tracking-wide uppercase">
            {item.kind}
          </span>
          <span className="text-muted text-xs">{item.projectName}</span>
        </div>
        <h3 className="mt-1 font-semibold">{item.title}</h3>
        <p className="text-muted mt-1 text-sm">{item.reason}</p>
        <div className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            {item.exposureCents === null
              ? "Impact not estimated"
              : `${formatMoney(item.exposureCents)} est. exposure`}
          </span>
          <span>{item.ownerName}</span>
          <span>
            {item.dueAt
              ? `Due ${new Date(item.dueAt).toLocaleDateString()}`
              : "No due date"}
          </span>
          <span className="capitalize">{item.status.replaceAll("_", " ")}</span>
        </div>
      </div>
      <Link
        href={item.href}
        className="bg-deep-green inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
      >
        {item.nextAction}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}

function WorkInMotion({ view }: { view: DashboardView }) {
  const groups = [
    {
      title: "Overdue actions",
      icon: Clock3,
      count: view.work.overdue.length,
      actions: view.work.overdue,
    },
    {
      title: "Due today",
      icon: CalendarClock,
      count: view.work.dueToday.length,
      actions: view.work.dueToday,
    },
    {
      title: "Waiting externally",
      icon: ShieldAlert,
      count: view.work.waitingExternal.length,
      actions: view.work.waitingExternal,
    },
  ];
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {groups.map(({ title, icon: Icon, count, actions }) => (
        <Card key={title} role="region" aria-label={title}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="text-deep-green size-4" aria-hidden="true" />
              <h3 className="font-semibold">{title}</h3>
            </div>
            <span className="bg-background rounded-full px-2.5 py-1 text-xs font-semibold">
              {count}
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {actions.length ? (
              actions.slice(0, 2).map((action) => (
                <div
                  key={action.id}
                  className="border-border border-t pt-4 first:border-t-0 first:pt-0"
                >
                  <Link
                    href={`/risks/${action.riskId}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {action.title}
                  </Link>
                  <div className="mt-3">
                    <ActionControls
                      initialAction={action}
                      owners={view.owners}
                      transport="api"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted py-5 text-sm">Nothing in this queue.</p>
            )}
          </div>
          {count > 2 && (
            <Link
              href="/actions"
              className="text-deep-green mt-4 inline-block text-sm font-semibold"
            >
              View {count - 2} more
            </Link>
          )}
        </Card>
      ))}
      <Card role="region" aria-label="Risks with no owner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleUserRound
              className="text-deep-green size-4"
              aria-hidden="true"
            />
            <h3 className="font-semibold">Risks with no owner</h3>
          </div>
          <span className="bg-background rounded-full px-2.5 py-1 text-xs font-semibold">
            {view.work.unownedRisks.length}
          </span>
        </div>
        {view.work.unownedRisks.length ? (
          <ul className="mt-4 space-y-3">
            {view.work.unownedRisks.map((risk) => (
              <li
                key={risk.id}
                className="border-border border-t pt-3 first:border-t-0"
              >
                <Link
                  href={`/risks/${risk.id}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {risk.title}
                </Link>
                <p className="text-muted mt-1 text-xs">{risk.projectName}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted py-5 text-sm">
            Every active risk has an owner.
          </p>
        )}
      </Card>
      <Card role="region" aria-label="Recently completed actions">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="text-deep-green size-4"
              aria-hidden="true"
            />
            <h3 className="font-semibold">Recently completed</h3>
          </div>
          <span className="bg-background rounded-full px-2.5 py-1 text-xs font-semibold">
            {view.work.recentlyCompleted.length}
          </span>
        </div>
        {view.work.recentlyCompleted.length ? (
          <ul className="mt-4 space-y-3">
            {view.work.recentlyCompleted.map((action) => (
              <li
                key={action.id}
                className="border-border border-t pt-3 first:border-t-0"
              >
                <Link
                  href={`/risks/${action.riskId}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {action.title}
                </Link>
                <p className="text-muted mt-1 text-xs">
                  Completed{" "}
                  {action.completedAt
                    ? new Date(action.completedAt).toLocaleDateString()
                    : "recently"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted py-5 text-sm">
            No actions were completed in the last seven days.
          </p>
        )}
      </Card>
    </div>
  );
}

function ValueDelivered({ value }: { value: DashboardView["value"] }) {
  const metrics = [
    {
      label: "Risks resolved",
      value: value.risksResolved.toString(),
      detail: "this month",
    },
    {
      label: "Estimated exposure reduced",
      value: formatMoney(value.estimatedExposureReducedCents),
      detail: "associated with resolved risks",
    },
    {
      label: "Estimated loss avoided",
      value:
        value.estimatedLossAvoidedCents === null
          ? "Not enough data"
          : formatMoney(value.estimatedLossAvoidedCents),
      detail: "reported outcome estimate, not attributed solely to Sightline",
    },
    {
      label: "Average time to resolution",
      value:
        value.averageResolutionHours === null
          ? "Not enough data"
          : `${value.averageResolutionHours} hrs`,
      detail: "for resolved risks this month",
    },
    {
      label: "Action completion rate",
      value:
        value.actionCompletionRate === null
          ? "Not enough data"
          : `${value.actionCompletionRate}%`,
      detail: "recommended actions created this month",
    },
  ];
  return (
    <div className="bg-border mt-4 grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-surface p-5">
          <CircleDollarSign
            className="text-deep-green size-4"
            aria-hidden="true"
          />
          <p className="text-muted mt-4 text-xs font-semibold tracking-wide uppercase">
            {metric.label}
          </p>
          <p className="mt-2 text-xl font-semibold">{metric.value}</p>
          <p className="text-muted mt-2 text-xs leading-5">{metric.detail}</p>
        </div>
      ))}
    </div>
  );
}

function NoActiveRisks() {
  return (
    <div className="py-10 text-center">
      <CheckCircle2
        className="text-deep-green mx-auto size-6"
        aria-hidden="true"
      />
      <h3 className="mt-3 font-semibold">No active risks need attention</h3>
      <p className="text-muted mt-1 text-sm">
        New detections and overdue actions will appear here.
      </p>
    </div>
  );
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(/[’\s]+/g, "-");
}
