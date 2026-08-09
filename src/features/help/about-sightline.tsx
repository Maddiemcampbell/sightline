import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileSearch,
  FolderKanban,
  History,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";

const capabilities = [
  {
    icon: FileSearch,
    title: "Detect what changed",
    body: "Bring project records, documents, and activity into one evidence trail so emerging risks are easier to find.",
  },
  {
    icon: Target,
    title: "Focus attention",
    body: "Prioritize supported risks and overdue work across the projects each person is authorized to view.",
  },
  {
    icon: Users,
    title: "Coordinate the response",
    body: "Assign actions, preserve decisions, and give project teams the context needed to move work forward.",
  },
  {
    icon: BarChart3,
    title: "Report with context",
    body: "Move from portfolio signals to permission-aware reports without losing the records behind the result.",
  },
] as const;

const workflow = [
  ["01", "Connect", "Add authorized project information and documents."],
  ["02", "Review", "See prioritized risks and the evidence supporting them."],
  ["03", "Respond", "Assign actions, draft outreach, and document decisions."],
  [
    "04",
    "Learn",
    "Use activity and resolutions to retain organizational context.",
  ],
] as const;

export function AboutSightline() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <section className="border-border relative overflow-hidden rounded-2xl border bg-[#0b3328] px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
        <div className="bg-accent/10 absolute -top-28 -right-24 size-80 rounded-full blur-3xl" />
        <div className="relative max-w-4xl">
          <div className="text-accent flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase">
            <Sparkles className="size-4" aria-hidden="true" />
            About Sightline
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl sm:leading-[1.08]">
            See risk sooner. Protect project profit.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/75 sm:text-lg">
            Sightline is a profit-intelligence workspace for commercial
            construction teams. It connects portfolio signals to project
            evidence, helping leaders understand what needs attention and
            helping teams coordinate a defensible response.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/brief"
              className="bg-accent text-deep-green hover:bg-accent-strong inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-sm font-semibold"
            >
              Open Daily Brief{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/ask"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/25 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ask Sightline <Sparkles className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="built-for-work" className="mt-12">
        <div className="max-w-3xl">
          <p className="text-deep-green text-xs font-semibold tracking-[0.12em] uppercase">
            Built for the work
          </p>
          <h2
            id="built-for-work"
            className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl"
          >
            One line of sight from signal to response
          </h2>
          <p className="text-muted mt-3 leading-7">
            Portfolio leaders get a consistent view across projects while the
            people closest to the work retain the detail required to act.
          </p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {capabilities.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="flex min-h-60 flex-col">
              <span className="bg-soft-green text-deep-green grid size-10 place-items-center rounded-lg">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="text-muted mt-2 text-sm leading-6">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="workflow"
        className="mt-12 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]"
      >
        <div className="bg-soft-green rounded-xl p-6 sm:p-8">
          <FolderKanban className="text-deep-green size-6" aria-hidden="true" />
          <p className="text-deep-green mt-6 text-xs font-semibold tracking-[0.12em] uppercase">
            The workflow
          </p>
          <h2
            id="workflow"
            className="mt-2 text-2xl font-semibold tracking-[-0.035em]"
          >
            Context stays attached to every decision
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            Sightline is designed to strengthen project judgment—not replace the
            accountable people making the call.
          </p>
        </div>
        <Card className="p-0">
          <ol className="divide-border divide-y">
            {workflow.map(([number, title, body]) => (
              <li
                key={number}
                className="grid gap-2 px-5 py-5 sm:grid-cols-[3rem_8rem_1fr] sm:items-start sm:px-7"
              >
                <span className="text-deep-green text-xs font-semibold">
                  {number}
                </span>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-muted text-sm leading-6">{body}</p>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section aria-labelledby="trust" className="mt-12">
        <Card className="overflow-hidden p-0">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-[#13212a] p-6 text-white sm:p-8 lg:p-10">
              <ShieldCheck className="text-accent size-7" aria-hidden="true" />
              <p className="text-accent mt-6 text-xs font-semibold tracking-[0.12em] uppercase">
                Trust by design
              </p>
              <h2
                id="trust"
                className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl"
              >
                AI should make the evidence clearer
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Ask Sightline works within the selected project scope and the
                member&apos;s existing permissions. Supported answers link back
                to their sources and disclose important gaps.
              </p>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8 lg:p-10">
              <TrustItem icon={LockKeyhole} title="Permission-aware">
                Organization and project roles control accessible projects,
                financial information, documents, and administration.
              </TrustItem>
              <TrustItem icon={BookOpen} title="Evidence-grounded">
                Answers show the authorized records used so people can verify
                claims before acting.
              </TrustItem>
              <TrustItem icon={History} title="Human-controlled">
                People review recommendations, edit drafts, assign work, and
                remain responsible for project decisions.
              </TrustItem>
              <TrustItem icon={CheckCircle2} title="Honest about gaps">
                When the available records cannot support an answer, Sightline
                identifies what is missing instead of inventing certainty.
              </TrustItem>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <ResourceLink
          href="/help/documentation"
          icon={BookOpen}
          title="Read the product guide"
          detail="Understand the core workflow and access model."
        />
        <ResourceLink
          href="/settings/privacy"
          icon={ShieldCheck}
          title="Privacy & Trust Center"
          detail="Review privacy controls and organizational safeguards."
        />
        <ResourceLink
          href="mailto:support@sightline.app?subject=Sightline%20support%20request"
          icon={Mail}
          title="Contact support"
          detail="Get help from the Sightline product team."
        />
      </section>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Icon className="text-deep-green size-5" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="text-muted mt-2 text-sm leading-6">{children}</p>
    </div>
  );
}

function ResourceLink({
  href,
  icon: Icon,
  title,
  detail,
}: {
  href: string;
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="border-border bg-surface hover:border-accent-strong group rounded-lg border p-5 shadow-sm transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-md">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <ArrowRight
          className="text-muted group-hover:text-deep-green size-4 transition-colors"
          aria-hidden="true"
        />
      </div>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="text-muted mt-1 text-sm leading-6">{detail}</p>
    </Link>
  );
}
