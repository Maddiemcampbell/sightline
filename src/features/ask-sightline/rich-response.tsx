import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import type { SharedAskMessage } from "@/features/ask-sightline/shared-types";
import { advisorModeLabels } from "@/features/workspace/advisor-selector";

const responsePresentation = {
  project: {
    label: "Project records",
    description: "Execution context supporting this answer",
    types: ["project", "action", "document"],
    href: "/projects",
    icon: BriefcaseBusiness,
  },
  executive: {
    label: "Leadership attention",
    description: "Material portfolio signals and supporting records",
    types: ["observation", "risk", "action"],
    href: "/brief",
    icon: Sparkles,
  },
  risk: {
    label: "Risk signals",
    description: "Evidence, mitigations, and related risk records",
    types: ["risk", "evidence", "action"],
    href: "/risks",
    icon: ShieldAlert,
  },
  financial: {
    label: "Financial evidence",
    description: "Authorized financial values and their limitations",
    types: ["project", "risk", "forecast"],
    href: "/reports",
    icon: CircleDollarSign,
  },
  forecast: {
    label: "Forecast outlook",
    description: "Current projections, confidence, and contributing signals",
    types: ["forecast", "risk", "action"],
    href: "/forecasts",
    icon: BarChart3,
  },
} as const;

export function RichResponse({ message }: { message: SharedAskMessage }) {
  const mode = message.routedAdvisorMode;
  if (!mode || !message.citations.length) return null;
  const presentation = responsePresentation[mode];
  const Icon = presentation.icon;
  const preferredTypes: readonly string[] = presentation.types;
  const preferred = [
    ...message.citations.filter((citation) =>
      preferredTypes.includes(citation.entityType),
    ),
    ...message.citations,
  ]
    .filter(
      (citation, index, all) =>
        all.findIndex((candidate) => candidate.id === citation.id) === index,
    )
    .slice(0, 3);

  return (
    <section
      aria-label={`${presentation.label} summary`}
      className="border-border bg-background/70 mt-4 overflow-hidden rounded-xl border"
    >
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-lg">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">{presentation.label}</h3>
            <p className="text-muted text-xs">{presentation.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {message.confidence !== null ? (
            <span className="bg-surface rounded-full px-2.5 py-1 font-semibold">
              {message.confidence}% confidence
            </span>
          ) : null}
          <span className="text-muted">
            {message.citations.length}{" "}
            {message.citations.length === 1 ? "source" : "sources"}
          </span>
        </div>
      </div>
      <div className="grid gap-px bg-[var(--color-border)] md:grid-cols-3">
        {preferred.map((citation) => (
          <Link
            key={citation.id}
            href={citation.href}
            className="bg-surface hover:bg-soft-green min-w-0 p-4 transition-colors"
          >
            <span className="text-muted text-[0.65rem] font-semibold uppercase">
              {citation.entityType}
            </span>
            <span className="mt-1 flex items-start justify-between gap-2 text-sm font-semibold">
              <span className="line-clamp-2">{citation.title}</span>
              <ArrowUpRight
                className="text-muted size-3.5 shrink-0"
                aria-hidden="true"
              />
            </span>
            <span className="text-muted mt-2 line-clamp-3 text-xs leading-5">
              {citation.excerpt}
            </span>
          </Link>
        ))}
      </div>
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs">
        <span className="text-muted">
          Routed to {advisorModeLabels[mode]}
          {message.missingInformation.length
            ? ` · ${message.missingInformation.length} evidence ${message.missingInformation.length === 1 ? "gap" : "gaps"}`
            : " · no stated evidence gaps"}
        </span>
        <Link
          href={presentation.href}
          className="text-deep-green font-semibold hover:underline"
        >
          Open full workspace
        </Link>
      </div>
    </section>
  );
}
