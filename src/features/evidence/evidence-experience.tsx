import { AlertTriangle, ExternalLink, FileText, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import type {
  EvidenceExperience as EvidenceExperienceData,
  EvidenceItemView,
} from "@/features/evidence/types";

const evidenceTypeLabels: Record<EvidenceItemView["evidenceType"], string> = {
  document_excerpt: "Document excerpt",
  contract_clause: "Contract clause",
  insurance_expiration: "Insurance expiration",
  daily_log_entry: "Daily log entry",
  weather_event: "Weather event",
  schedule_event: "Schedule event",
  project_metadata: "Project metadata",
  historical_risk: "Historical risk",
  manual_note: "Manual note",
  system_rule: "System rule",
};

const supportLabels: Record<EvidenceItemView["supportType"], string> = {
  direct: "Direct evidence",
  inferred: "Inferred conclusion",
  assumption: "Assumption",
};

export function EvidenceExperience({
  experience,
}: {
  experience: EvidenceExperienceData;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-3">
          <Sparkles
            aria-hidden="true"
            className="text-deep-green mt-0.5 size-5"
          />
          <div>
            <p className="text-muted text-xs font-semibold tracking-wide uppercase">
              Why is this high risk?
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              Evidence-grounded explanation
            </h2>
          </div>
        </div>
        <p className="mt-4 leading-7">
          {experience.explanation.evidenceSummary}
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <ExplanationList
            title="Confidence factors"
            items={experience.explanation.confidenceFactors}
          />
          <ExplanationList
            title="Missing information"
            items={experience.explanation.missingInformation}
          />
          <ExplanationList
            title="Assumptions"
            items={experience.explanation.assumptions}
          />
        </div>
        <p className="text-muted mt-5 border-t pt-4 text-sm">
          Confidence score:{" "}
          <strong className="text-ink">{experience.confidenceScore}%</strong>.
          This is concise supporting rationale, not model chain-of-thought.
        </p>
      </Card>

      <section aria-labelledby="evidence-list-heading">
        <div className="mb-4">
          <h2 id="evidence-list-heading" className="text-xl font-semibold">
            Evidence used for confidence
          </h2>
          <p className="text-muted mt-1 text-sm">
            Direct sources are separated from conclusions and assumptions.
          </p>
        </div>
        {experience.items.length ? (
          <div className="space-y-4">
            {experience.items.map((item) => (
              <EvidenceCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <AlertTriangle aria-hidden="true" className="text-muted size-5" />
            <p className="mt-3 font-semibold">
              No supporting evidence is attached.
            </p>
            <p className="text-muted mt-1 text-sm">
              Treat this risk as unverified until a source is added.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}

export function EvidenceCard({ item }: { item: EvidenceItemView }) {
  const location = formatSourceLocation(item);
  return (
    <article
      className="border-border bg-surface rounded-xl border p-5"
      aria-label={item.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <FileText
            aria-hidden="true"
            className="text-deep-green mt-0.5 size-5 shrink-0"
          />
          <div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-muted mt-1 text-sm">
              {item.sourceLabel} · {evidenceTypeLabels[item.evidenceType]}
            </p>
          </div>
        </div>
        <span className="bg-background border-border rounded-full border px-2.5 py-1 text-xs font-semibold">
          {supportLabels[item.supportType]}
        </span>
      </div>
      <blockquote className="border-deep-green bg-background mt-4 rounded-r-lg border-l-2 px-4 py-3 text-sm leading-6">
        <mark className="bg-accent/45 text-ink">{item.excerpt}</mark>
      </blockquote>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-muted text-xs font-semibold uppercase">
            Why it matters
          </p>
          <p className="mt-1 text-sm leading-6">{item.whyItMatters}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">Source date</dt>
            <dd className="mt-1 font-medium">{formatDate(item.occurredAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">Location</dt>
            <dd className="mt-1 font-medium">{location ?? "Not supplied"}</dd>
          </div>
          <div>
            <dt className="text-muted">Relevance</dt>
            <dd className="mt-1 font-medium">{item.relevanceScore}%</dd>
          </div>
        </dl>
      </div>
      {item.documentId && item.documentAvailable ? (
        <a
          href={`/api/documents/${item.documentId}/download`}
          className="text-deep-green mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Open source document{" "}
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      ) : item.documentId ? (
        <p className="text-muted mt-4 text-sm">
          Source document is unavailable or archived.
        </p>
      ) : null}
    </article>
  );
}

function ExplanationList({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="text-muted mt-2 space-y-2 text-sm">
        {(items.length ? items : ["None identified."]).map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function formatSourceLocation(item: EvidenceItemView) {
  const parts = [
    item.pageNumber ? `Page ${item.pageNumber}` : null,
    item.lineStart
      ? `Line${item.lineEnd && item.lineEnd !== item.lineStart ? "s" : ""} ${item.lineStart}${item.lineEnd && item.lineEnd !== item.lineStart ? `–${item.lineEnd}` : ""}`
      : null,
    item.sourceLocation,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
