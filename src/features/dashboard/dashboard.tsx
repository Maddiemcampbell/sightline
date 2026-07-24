import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  History,
  Lightbulb,
  ListChecks,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import type { DashboardView } from "@/features/dashboard/types";
import { formatMoney } from "@/features/daily-brief/formatters";
import type {
  HistoricalComparison,
  PortfolioObservation,
  RootCauseSuggestion,
} from "@/features/portfolio-intelligence/types";

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
            Add a project to begin seeing evidence-backed patterns, historical
            comparisons, and prioritized recommendations.
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

  const intelligence = view.intelligence;
  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-8 lg:py-10">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-deep-green text-sm font-semibold">{date}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Good morning, {firstName}.
          </h1>
          <p className="text-muted mt-3 max-w-2xl text-base leading-7">
            {changeSummary(view)} Sightline found{" "}
            {intelligence.portfolioWatch.length} portfolio signal
            {intelligence.portfolioWatch.length === 1 ? "" : "s"} that currently
            deserve executive attention.
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
        title="Portfolio Watch"
        description="The three highest-impact observations supported by current organization data."
        className="mt-10"
      >
        {intelligence.portfolioWatch.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {intelligence.portfolioWatch.map((observation, index) => (
              <ObservationCard
                key={observation.key}
                observation={observation}
                rank={index + 1}
                canViewFinancials={view.canViewFinancials}
              />
            ))}
          </div>
        ) : (
          <EmptyState>
            No cross-project pattern currently meets Sightline’s deterministic
            thresholds.
          </EmptyState>
        )}
      </Section>

      <Section
        title="Emerging Patterns"
        description="Early signals and carefully framed hypotheses. Sightline omits suggestions when evidence is insufficient."
        className="mt-10"
      >
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {intelligence.rootCauseSuggestions.map((suggestion) => (
            <HypothesisCard key={suggestion.key} suggestion={suggestion} />
          ))}
          {intelligence.emergingPatterns.map((pattern) => (
            <Card key={pattern.observation.key}>
              <p className="text-deep-green text-xs font-semibold uppercase">
                Early deterministic signal
              </p>
              <h3 className="mt-2 font-semibold">
                {pattern.observation.title}
              </h3>
              <p className="text-muted mt-2 text-sm leading-6">
                {pattern.recentRiskCount} related risk
                {pattern.recentRiskCount === 1 ? "" : "s"} were detected in the
                last 30 days. This is a timing correlation, not a forecast.
              </p>
            </Card>
          ))}
        </div>
        {!intelligence.rootCauseSuggestions.length &&
          !intelligence.emergingPatterns.length && (
            <EmptyState>
              No emerging pattern has enough evidence to show. Sightline will
              not speculate from weak signals.
            </EmptyState>
          )}
      </Section>

      <Section
        title="Similar to Last Quarter"
        description="Comparable resolved issues from this organization’s accessible history, with recorded outcomes."
        className="mt-10"
      >
        {intelligence.historicalComparisons.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {intelligence.historicalComparisons.map((comparison) => (
              <HistoricalCard
                key={`${comparison.currentRiskId}:${comparison.match.riskId}`}
                comparison={comparison}
              />
            ))}
          </div>
        ) : (
          <EmptyState>
            No resolved historical case meets the deterministic similarity
            threshold for current risks.
          </EmptyState>
        )}
      </Section>

      <Section
        title="Executive Recommendations"
        description="Prioritized investigation and response steps derived from the evidence above."
        className="mt-10"
      >
        {intelligence.executiveRecommendations.length ? (
          <Card className="mt-4 p-0">
            <ol>
              {intelligence.executiveRecommendations.map((recommendation) => (
                <li
                  key={recommendation.key}
                  className="border-border grid gap-4 border-b p-5 last:border-b-0 md:grid-cols-[2.25rem_minmax(0,1fr)_auto] md:items-center"
                >
                  <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-full text-sm font-semibold">
                    {recommendation.priority}
                  </span>
                  <div>
                    <p className="text-muted text-xs font-semibold uppercase">
                      {recommendation.source === "hypothesis"
                        ? "Investigation"
                        : "Observed condition"}
                    </p>
                    <h3 className="mt-1 font-semibold">
                      {recommendation.title}
                    </h3>
                    <p className="text-muted mt-1 text-sm leading-6">
                      {recommendation.rationale}
                    </p>
                    <p className="mt-2 text-sm">
                      <strong>Next step:</strong> {recommendation.nextStep}
                    </p>
                  </div>
                  <Link
                    href={recommendation.href}
                    className="border-border text-deep-green inline-flex min-h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        ) : (
          <EmptyState>
            No executive recommendation is warranted by the current evidence.
          </EmptyState>
        )}
      </Section>

      <p className="text-muted mt-10 border-t pt-5 text-xs leading-5">
        Portfolio observations are deterministic. Root-cause suggestions are
        hypotheses for investigation, never conclusions or predictions.
      </p>
    </div>
  );
}

function ObservationCard({
  observation,
  rank,
  canViewFinancials,
}: {
  observation: PortfolioObservation;
  rank: number;
  canViewFinancials: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-full font-semibold">
          {rank}
        </span>
        <span className="bg-background rounded-full px-2.5 py-1 text-xs font-semibold">
          {observation.confidence}% confidence
        </span>
      </div>
      <h3 className="mt-4 text-lg leading-7 font-semibold">
        {observation.title}
      </h3>
      <p className="text-muted mt-2 text-sm leading-6">{observation.summary}</p>
      <dl className="mt-4 grid gap-3 text-sm">
        <Fact
          label="Current exposure represented"
          value={
            !canViewFinancials
              ? "Restricted for your role"
              : observation.businessImpactEstimateCents === null
                ? "Not estimated"
                : formatMoney(observation.businessImpactEstimateCents)
          }
        />
        <Fact
          label="Affected projects"
          value={observation.affectedProjects
            .map((project) => project.name)
            .join(", ")}
        />
      </dl>
      <details className="border-border mt-4 border-t pt-4">
        <summary className="text-deep-green cursor-pointer text-sm font-semibold">
          Evidence and calculation
        </summary>
        <ul className="text-muted mt-3 space-y-2 text-sm">
          {observation.supportingEvidence.map((item) => (
            <li key={`${item.entityType}:${item.entityId}`}>
              <strong className="text-ink">{item.label}:</strong> {item.value}
            </li>
          ))}
        </ul>
        <p className="text-muted mt-3 text-xs leading-5">
          {observation.businessImpactExplanation}
        </p>
      </details>
    </Card>
  );
}

function HypothesisCard({ suggestion }: { suggestion: RootCauseSuggestion }) {
  return (
    <Card id={`hypothesis-${suggestion.key}`} className="border-amber-200">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-9 place-items-center rounded-full bg-amber-50 text-amber-800">
          <Lightbulb className="size-4" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
          {suggestion.confidence}% hypothesis confidence
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold text-amber-800 uppercase">
        Hypothesis — not a conclusion
      </p>
      <h3 className="mt-1 text-lg font-semibold">{suggestion.title}</h3>
      <p className="text-muted mt-2 text-sm leading-6">
        {suggestion.hypothesis}
      </p>
      <details className="border-border mt-4 border-t pt-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Evidence, assumptions, and investigation
        </summary>
        <DetailList
          icon={Eye}
          title="Evidence"
          items={suggestion.evidence.map(
            (item) => `${item.label}: ${item.value}`,
          )}
        />
        <DetailList
          icon={BookOpenCheck}
          title="Assumptions to validate"
          items={suggestion.assumptions}
        />
        <DetailList
          icon={ListChecks}
          title="Investigation steps"
          items={suggestion.recommendedInvestigationSteps}
          ordered
        />
        <DetailList
          icon={History}
          title="Similar historical cases"
          items={
            suggestion.similarHistoricalCases.length
              ? suggestion.similarHistoricalCases.map(
                  (item) =>
                    `${item.projectName}: ${item.title} — ${item.outcome}`,
                )
              : ["No sufficiently similar resolved case is available."]
          }
        />
      </details>
    </Card>
  );
}

function HistoricalCard({ comparison }: { comparison: HistoricalComparison }) {
  return (
    <Card>
      <p className="text-deep-green text-xs font-semibold uppercase">
        {comparison.match.similarityScore}% deterministic similarity
      </p>
      <h3 className="mt-2 font-semibold">
        {comparison.currentRiskTitle} resembles a resolved issue on{" "}
        {comparison.match.projectName}
      </h3>
      <p className="text-muted mt-3 text-sm leading-6">
        {comparison.match.resolutionSummary}
      </p>
      <dl className="mt-4 grid gap-3 text-sm">
        <Fact label="Recorded outcome" value={comparison.match.outcome} />
        <Fact
          label="Resolution time"
          value={formatDuration(comparison.match.timeToResolutionHours)}
        />
        <Fact
          label="Why it matched"
          value={comparison.match.matchReasons.join(", ")}
        />
      </dl>
      <Link
        href={`/risks/${comparison.currentRiskId}`}
        className="text-deep-green mt-4 inline-flex items-center gap-1 text-sm font-semibold"
      >
        Compare cases <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </Card>
  );
}

function DetailList({
  icon: Icon,
  title,
  items,
  ordered = false,
}: {
  icon: typeof Eye;
  title: string;
  items: readonly string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className="mt-4">
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {title}
      </h4>
      <List
        className={`text-muted mt-2 space-y-1 text-sm ${ordered ? "list-decimal pl-5" : "list-disc pl-5"}`}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </List>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs font-semibold uppercase">{label}</dt>
      <dd className="mt-1 leading-5">{value}</dd>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="mt-4">
      <p className="text-muted text-sm">{children}</p>
    </Card>
  );
}

function Section({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className} aria-labelledby={slug(title)}>
      <h2 id={slug(title)} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-muted mt-1 max-w-3xl text-sm leading-6">
        {description}
      </p>
      {children}
    </section>
  );
}

function changeSummary(view: DashboardView) {
  const newRisks = view.overnight.newRisks.value;
  const resolved = view.overnight.resolvedRisks.value;
  const overdue = view.overnight.overdueActions.value;
  return `Since the start of today: ${newRisks} new risk${newRisks === 1 ? "" : "s"}, ${resolved} resolved, and ${overdue} overdue action${overdue === 1 ? "" : "s"}.`;
}

function formatDuration(hours: number) {
  return hours < 48
    ? `${Math.max(1, Math.round(hours))} hours`
    : `${Math.round(hours / 24)} days`;
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(/[’\s]+/g, "-");
}
