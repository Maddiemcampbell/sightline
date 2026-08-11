import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  CalendarCheck2,
  ChartNoAxesCombined,
  FileText,
  Gauge,
  History,
  Lightbulb,
  ListChecks,
  Plug,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Presentation,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";

const contents = [
  ["getting-started", "Getting started"],
  ["daily-workflow", "Daily workflow"],
  ["workspace-guide", "Workspace guide"],
  ["workflow-guides", "Planning & follow-through"],
  ["ask-sightline", "Ask Sightline"],
  ["access", "Roles and access"],
] as const;

const workspaceGuides = [
  {
    icon: BriefcaseBusiness,
    title: "Projects",
    body: "Review project health, assignments, contract context, and the risks affecting delivery.",
    href: "/projects",
  },
  {
    icon: CalendarCheck2,
    title: "Meetings",
    body: "Prepare an evidence-backed agenda, capture decisions, and assign follow-up work without losing project context.",
    href: "/meetings",
  },
  {
    icon: ShieldAlert,
    title: "Risks",
    body: "Inspect severity, cited evidence, recommended actions, and the full resolution history.",
    href: "/risks",
  },
  {
    icon: ListChecks,
    title: "Actions",
    body: "Track ownership, due dates, status, and the work required to respond to active risks.",
    href: "/actions",
  },
  {
    icon: FileText,
    title: "Documents",
    body: "Maintain the authorized source material used to understand and support project risk.",
    href: "/documents",
  },
  {
    icon: History,
    title: "Activity",
    body: "Follow decisions and changes across the projects and records you are permitted to see.",
    href: "/activity",
  },
  {
    icon: BarChart3,
    title: "Reports",
    body: "Export permission-aware PDFs or generate editable executive PowerPoint decks for review.",
    href: "/reports",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Forecasting",
    body: "Review deterministic cash, margin, budget, and schedule outlooks with explicit confidence and data-quality signals.",
    href: "/forecasts",
  },
  {
    icon: Plug,
    title: "Integrations",
    body: "Connect supported sources, map external records to projects, and monitor synchronization readiness.",
    href: "/integrations",
  },
] as const;

export function ProductGuide() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header className="border-border overflow-hidden rounded-2xl border bg-gradient-to-br from-white to-[#f4f7ed] px-6 py-8 sm:px-10 sm:py-10">
        <div className="grid items-end gap-7 lg:grid-cols-[1fr_auto]">
          <div className="max-w-4xl">
            <div className="text-deep-green flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase">
              <BookOpen className="size-4" aria-hidden="true" /> Product guide
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Get productive with Sightline
            </h1>
            <p className="text-muted mt-4 max-w-3xl text-base leading-7 sm:text-lg">
              Learn how to move from portfolio signals to evidence-backed
              action, keep project context current, and use Sightline&apos;s AI
              assistant responsibly.
            </p>
          </div>
          <Link
            href="/brief"
            className="bg-deep-green inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white"
          >
            Open Daily Brief{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <aside aria-label="Guide contents" className="xl:sticky xl:top-24">
          <p className="text-muted px-3 text-xs font-semibold tracking-[0.1em] uppercase">
            On this page
          </p>
          <nav className="mt-3">
            <ul className="space-y-1">
              {contents.map(([href, label]) => (
                <li key={href}>
                  <a
                    href={`#${href}`}
                    className="text-muted hover:bg-soft-green hover:text-deep-green block rounded-md px-3 py-2 text-sm font-medium"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-border mt-5 border-t px-3 pt-5">
            <p className="text-muted text-xs leading-5">
              Need more help? Contact the Sightline team for product support.
            </p>
            <a
              href="mailto:support@sightline.app?subject=Sightline%20support%20request"
              className="text-deep-green mt-2 inline-flex items-center gap-1 text-xs font-semibold"
            >
              Contact support{" "}
              <ArrowRight className="size-3" aria-hidden="true" />
            </a>
          </div>
        </aside>

        <main className="min-w-0 space-y-12">
          <GuideSection
            id="getting-started"
            eyebrow="Start here"
            title="Set up the workspace around real project decisions"
            introduction="Sightline becomes useful when projects, access, and source records reflect how your team already works. Begin with a narrow, verifiable scope and expand from there."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <StepCard number="1" title="Confirm access">
                Make sure each member has the correct organization role and
                project assignments.
              </StepCard>
              <StepCard number="2" title="Add project context">
                Keep project details, documents, owners, and dates current so
                risks have useful context.
              </StepCard>
              <StepCard number="3" title="Review together">
                Validate the first detected risks with the responsible project
                team before relying on portfolio patterns.
              </StepCard>
            </div>
            <div className="bg-soft-amber mt-4 flex gap-3 rounded-lg p-4 text-sm leading-6">
              <Lightbulb
                className="text-warning mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>Recommended rollout:</strong> start with one or two
                active projects, confirm the evidence and permissions, then add
                the remaining portfolio.
              </p>
            </div>
          </GuideSection>

          <GuideSection
            id="daily-workflow"
            eyebrow="Everyday use"
            title="A practical daily workflow"
            introduction="Use the same sequence each day so urgent signals get attention without separating decisions from their evidence."
          >
            <Card className="p-0">
              <ol className="divide-border divide-y">
                <WorkflowRow
                  icon={Gauge}
                  title="Scan the Daily Brief"
                  body="Start with the highest-priority changes across your authorized projects."
                  href="/brief"
                  action="Review brief"
                />
                <WorkflowRow
                  icon={Search}
                  title="Open the supporting risk"
                  body="Confirm severity, source evidence, ownership, and what information may still be missing."
                  href="/risks"
                  action="Browse risks"
                />
                <WorkflowRow
                  icon={ClipboardCheck}
                  title="Coordinate the response"
                  body="Assign an action, set a realistic due date, and draft any necessary outreach."
                  href="/actions"
                  action="Open actions"
                />
                <WorkflowRow
                  icon={CheckCircle2}
                  title="Record the outcome"
                  body="When work is complete, preserve the resolution and rationale for future project context."
                  href="/activity"
                  action="View activity"
                />
              </ol>
            </Card>
          </GuideSection>

          <GuideSection
            id="workspace-guide"
            eyebrow="Feature reference"
            title="Navigate the workspace"
            introduction="Each area answers a different operational question while sharing the same authorized project context."
          >
            <div className="bg-soft-green mb-4 rounded-xl p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div>
                <h3 className="font-semibold">
                  Home is your portfolio overview
                </h3>
                <p className="text-muted mt-1 text-sm leading-6">
                  Use the distinct Home card to return to portfolio priorities.
                  On desktop, Watchlist and Settings are in the header; on
                  mobile, find them in Menu.
                </p>
              </div>
              <Link
                href="/"
                className="text-deep-green mt-3 inline-flex shrink-0 items-center gap-1 text-sm font-semibold sm:mt-0"
              >
                Open Home <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaceGuides.map(({ icon: Icon, title, body, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="border-border bg-surface hover:border-accent-strong group rounded-lg border p-5 shadow-sm transition-colors"
                >
                  <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-md">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 flex items-center justify-between gap-3 font-semibold">
                    {title}
                    <ArrowRight
                      className="text-muted group-hover:text-deep-green size-4"
                      aria-hidden="true"
                    />
                  </h3>
                  <p className="text-muted mt-2 text-sm leading-6">{body}</p>
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <InlineLink href="/integrations" icon={Plug}>
                Manage integrations
              </InlineLink>
              <InlineLink href="/settings" icon={Settings}>
                Configure settings
              </InlineLink>
            </div>
          </GuideSection>

          <GuideSection
            id="workflow-guides"
            eyebrow="Planning and follow-through"
            title="Use Sightline beyond the daily risk review"
            introduction="These focused guides cover the newer workflows where data quality, human review, and operational follow-through matter most."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <GuideLink
                href="/help/forecasting"
                icon={ChartNoAxesCombined}
                title="Forecast with confidence"
                body="Interpret the baseline, test bounded scenarios, and improve weak project inputs."
              />
              <GuideLink
                href="/help/reports-meetings"
                icon={Presentation}
                title="Prepare executive reviews"
                body="Choose the right report or meeting workflow, review generated content, and preserve decisions."
              />
              <GuideLink
                href="/help/follow-ups-alerts"
                icon={BellRing}
                title="Close the commitment loop"
                body="Track requested responses, handle exceptions, verify arriving evidence, and escalate responsibly."
              />
            </div>
          </GuideSection>

          <GuideSection
            id="ask-sightline"
            eyebrow="AI assistant"
            title="Ask questions without losing the evidence"
            introduction="Ask Sightline searches the organization records you are allowed to access, adapts to project scope, and links supported answers back to their sources."
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <Card className="bg-[#0b3328] text-white">
                <Sparkles className="text-accent size-6" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold">
                  Good questions are specific
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
                  <li>“Which actions are overdue on Cedar Grove?”</li>
                  <li>“What evidence supports this insurance risk?”</li>
                  <li>“What changed across my projects this week?”</li>
                  <li>
                    “Which financial questions can’t the current data answer?”
                  </li>
                </ul>
                <Link
                  href="/ask"
                  className="bg-accent text-deep-green mt-6 inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold"
                >
                  Open Ask Sightline{" "}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Card>
              <Card>
                <h3 className="font-semibold">Before acting on an answer</h3>
                <Checklist
                  items={[
                    "Confirm the selected project scope.",
                    "Open and review the cited records.",
                    "Read any evidence limitations.",
                    "Apply accountable project judgment.",
                  ]}
                />
                <p className="text-muted border-border mt-5 border-t pt-4 text-xs leading-5">
                  Ask Sightline is a read-only analytical workspace. It does not
                  change project records from the conversation.
                </p>
              </Card>
            </div>
          </GuideSection>

          <GuideSection
            id="access"
            eyebrow="Permissions"
            title="Access follows organizational responsibility"
            introduction="Sightline filters projects, financial information, documents, and administrative controls using organization roles and project assignments."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <Users className="text-deep-green size-5" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">Organization access</h3>
                <p className="text-muted mt-2 text-sm leading-6">
                  Owners and administrators maintain organization membership and
                  settings. Other members see the workspace functions allowed
                  for their role.
                </p>
                <Link
                  href="/organization?section=team"
                  className="text-deep-green mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                >
                  Review team access{" "}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Card>
              <Card>
                <BriefcaseBusiness
                  className="text-deep-green size-5"
                  aria-hidden="true"
                />
                <h3 className="mt-4 font-semibold">Project access</h3>
                <p className="text-muted mt-2 text-sm leading-6">
                  Project assignments limit which project records appear in
                  lists, search, reports, and AI context. Financial visibility
                  is enforced separately where required.
                </p>
                <Link
                  href="/settings/projects"
                  className="text-deep-green mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                >
                  Review project access{" "}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Card>
            </div>
          </GuideSection>
        </main>
      </div>
    </div>
  );
}

function GuideSection({
  id,
  eyebrow,
  title,
  introduction,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  introduction: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="text-deep-green text-xs font-semibold tracking-[0.12em] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
        {title}
      </h2>
      <p className="text-muted mt-3 max-w-3xl leading-7">{introduction}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function StepCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <span className="bg-soft-green text-deep-green grid size-8 place-items-center rounded-full text-xs font-semibold">
        {number}
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="text-muted mt-2 text-sm leading-6">{children}</p>
    </Card>
  );
}

function WorkflowRow({
  icon: Icon,
  title,
  body,
  href,
  action,
}: {
  icon: typeof Gauge;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <li className="grid gap-4 p-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-6">
      <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-md">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted mt-1 text-sm leading-6">{body}</p>
      </div>
      <Link
        href={href}
        className="text-deep-green inline-flex items-center gap-1 text-sm font-semibold"
      >
        {action}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </li>
  );
}

function Checklist({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm">
          <CheckCircle2
            className="text-deep-green mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InlineLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof Plug;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border-border bg-surface hover:bg-background inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold"
    >
      <Icon className="text-deep-green size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

function GuideLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: typeof BellRing;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="border-border bg-surface hover:border-accent-strong group rounded-xl border p-5 shadow-sm transition-colors"
    >
      <span className="bg-soft-green text-deep-green grid size-10 place-items-center rounded-lg">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 flex items-center justify-between gap-3 font-semibold">
        {title}
        <ArrowRight
          className="text-muted group-hover:text-deep-green size-4"
          aria-hidden="true"
        />
      </h3>
      <p className="text-muted mt-2 text-sm leading-6">{body}</p>
    </Link>
  );
}
