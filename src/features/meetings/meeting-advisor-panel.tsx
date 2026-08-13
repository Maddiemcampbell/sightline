"use client";

import {
  Bot,
  CheckCheck,
  ClipboardCopy,
  FileText,
  ListChecks,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  generateMeetingAdvisorAction,
  type MeetingAdvisorActionState,
} from "@/app/meetings/actions";
import { Card } from "@/components/ui/card";

export function MeetingAdvisorPanel({
  meetingId,
  completed,
}: {
  meetingId: string;
  completed: boolean;
}) {
  const [state, action, pending] = useActionState<
    MeetingAdvisorActionState,
    FormData
  >(generateMeetingAdvisorAction, {});
  const [copied, setCopied] = useState<string | null>(null);
  const result = state.result;

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1_500);
  }

  return (
    <Card className="border-deep-green/20 overflow-hidden p-0">
      <div className="bg-soft-green border-deep-green/10 flex flex-wrap items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="bg-deep-green grid size-10 shrink-0 place-items-center rounded-lg text-white">
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-deep-green text-xs font-semibold tracking-[0.1em] uppercase">
              AI Meeting Advisor
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              Prepare, facilitate, and close with evidence
            </h2>
            <p className="text-muted mt-1 max-w-3xl text-sm">
              Sightline drafts from this meeting’s authorized records. Review
              every suggestion before recording or sharing it.
            </p>
          </div>
        </div>
        <span className="border-deep-green/20 text-deep-green rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold">
          Advisory only · no automatic changes
        </span>
      </div>

      <form action={action} className="grid gap-5 p-5 sm:p-6">
        <input type="hidden" name="meetingId" value={meetingId} />
        <label className="grid gap-2 text-sm font-semibold">
          Meeting notes{" "}
          <span className="text-muted font-normal">
            (optional for briefing and closeout)
          </span>
          <textarea
            name="notes"
            rows={4}
            className="border-border bg-background min-h-28 w-full rounded-lg border px-3 py-2 font-normal"
            placeholder="Paste rough notes, commitments, disagreements, or an outcome you want help organizing…"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <AdvisorButton
            name="briefing"
            label="Generate briefing"
            icon={<ListChecks className="size-4" />}
            pending={pending}
          />
          {!completed ? (
            <AdvisorButton
              name="facilitation"
              label="Draft outcomes from notes"
              icon={<Sparkles className="size-4" />}
              pending={pending}
            />
          ) : null}
          {!completed ? (
            <AdvisorButton
              name="closeout"
              label="Check meeting record"
              icon={<CheckCheck className="size-4" />}
              pending={pending}
            />
          ) : null}
          <AdvisorButton
            name="recap"
            label="Draft meeting recap"
            icon={<FileText className="size-4" />}
            pending={pending}
          />
        </div>
        {state.error ? (
          <p role="alert" className="text-danger text-sm">
            {state.error}
          </p>
        ) : null}
      </form>

      {result ? (
        <div className="border-border border-t p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
                Advisor draft
              </p>
              <h3 className="mt-1 text-xl font-semibold">
                {result.output.headline}
              </h3>
              <p className="text-muted mt-2 max-w-4xl text-sm leading-6">
                {result.output.overview}
              </p>
            </div>
            <span className="bg-background rounded-full px-3 py-1 text-xs font-semibold">
              {result.output.confidence}% confidence ·{" "}
              {result.generationSource === "ai"
                ? "AI generated"
                : "Deterministic fallback"}
            </span>
          </div>

          <ul className="mt-5 grid gap-3 lg:grid-cols-2">
            {result.output.items.map((item, index) => (
              <li
                key={`${item.label}-${index}`}
                className="border-border rounded-lg border p-4"
              >
                <p className="font-semibold">{item.label}</p>
                <p className="text-muted mt-1 text-sm leading-6">
                  {item.detail}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.citationIds.map((id) => {
                    const citation = result.citations.find(
                      (source) => source.id === id,
                    );
                    return citation ? (
                      <Link
                        key={id}
                        href={citation.href}
                        className="text-deep-green decoration-deep-green/30 text-xs font-semibold underline underline-offset-2"
                      >
                        {citation.title}
                      </Link>
                    ) : null;
                  })}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {result.output.decisionDraft ? (
              <DraftCard
                title="Proposed decision"
                value={`${result.output.decisionDraft.summary}\n\nRationale: ${result.output.decisionDraft.rationale}`}
                copied={copied === "decision"}
                onCopy={() =>
                  copy(
                    "decision",
                    `${result.output!.decisionDraft!.summary}\n\n${result.output!.decisionDraft!.rationale}`,
                  )
                }
              />
            ) : null}
            {result.output.followUpDraft ? (
              <DraftCard
                title="Proposed follow-up"
                value={`${result.output.followUpDraft.title}\n\nDefinition of done: ${result.output.followUpDraft.definitionOfDone}`}
                copied={copied === "follow-up"}
                onCopy={() =>
                  copy(
                    "follow-up",
                    `${result.output!.followUpDraft!.title}\n\n${result.output!.followUpDraft!.definitionOfDone}`,
                  )
                }
              />
            ) : null}
          </div>
          {result.output.recapDraft ? (
            <EmailRecapDraft
              key={result.output.recapDraft}
              subject={result.output.recapSubject ?? "Meeting recap"}
              body={result.output.recapDraft}
            />
          ) : null}
          {result.output.missingInformation.length ? (
            <div className="bg-soft-amber text-warning mt-5 rounded-lg p-4 text-sm">
              <p className="font-semibold">Confirm before using this draft</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.output.missingInformation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function AdvisorButton({
  name,
  label,
  icon,
  pending,
}: {
  name: string;
  label: string;
  icon: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button
      name="mode"
      value={name}
      disabled={pending}
      className="border-border bg-surface hover:border-deep-green/40 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold disabled:opacity-50"
    >
      {icon}
      {pending ? "Working…" : label}
    </button>
  );
}

function DraftCard({
  title,
  value,
  copied,
  onCopy,
}: {
  title: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="border-border rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold">{title}</h4>
        <button
          type="button"
          onClick={onCopy}
          className="text-deep-green inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold"
        >
          <ClipboardCopy className="size-4" aria-hidden="true" />{" "}
          {copied ? "Copied" : "Copy draft"}
        </button>
      </div>
      <textarea
        defaultValue={value}
        rows={5}
        className="border-border bg-background mt-3 w-full rounded-md border p-3 text-sm leading-6"
        aria-label={title}
      />
    </div>
  );
}

function EmailRecapDraft({ subject, body }: { subject: string; body: string }) {
  const [draftSubject, setDraftSubject] = useState(subject);
  const [draftBody, setDraftBody] = useState(body);
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    await navigator.clipboard.writeText(
      `Subject: ${draftSubject}\n\n${draftBody}`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="border-border bg-background mt-5 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold">Email-ready recap</h4>
          <p className="text-muted mt-1 text-xs">
            Add recipients and your signature after copying.
          </p>
        </div>
        <button
          type="button"
          onClick={copyEmail}
          className="text-deep-green inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-semibold"
        >
          <ClipboardCopy className="size-4" aria-hidden="true" />{" "}
          {copied ? "Email copied" : "Copy email draft"}
        </button>
      </div>
      <label className="mt-4 grid gap-1 text-sm font-semibold">
        Subject
        <input
          value={draftSubject}
          onChange={(event) => setDraftSubject(event.target.value)}
          className="border-border bg-surface h-11 w-full rounded-md border px-3 font-normal"
        />
      </label>
      <label className="mt-3 grid gap-1 text-sm font-semibold">
        Email body
        <textarea
          value={draftBody}
          onChange={(event) => setDraftBody(event.target.value)}
          rows={18}
          className="border-border bg-surface w-full rounded-md border p-3 leading-6 font-normal"
          aria-label="Editable meeting recap email body"
        />
      </label>
    </div>
  );
}
