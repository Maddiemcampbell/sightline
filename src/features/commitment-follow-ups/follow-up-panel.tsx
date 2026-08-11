"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import {
  recordCommitmentResponseAction,
  verifyCommitmentResponseAction,
} from "@/app/risks/[riskId]/email-draft/actions";
import { commitmentTiming } from "@/features/commitment-follow-ups/state";
import type { CommitmentFollowUpRow } from "@/lib/supabase/database-row.types";

type Evidence = Readonly<{
  id: string;
  title: string;
  excerpt: string;
  created_at: string;
}>;

export function FollowUpPanel({
  followUp,
  evidence,
  sentAt,
}: {
  followUp: CommitmentFollowUpRow;
  evidence: readonly Evidence[];
  sentAt: string;
}) {
  const router = useRouter();
  const candidateEvidence = evidence.filter(
    (item) => new Date(item.created_at) > new Date(sentAt),
  );
  const [evidenceId, setEvidenceId] = useState(
    followUp.response_evidence_id ?? candidateEvidence[0]?.id ?? "",
  );
  const [note, setNote] = useState(followUp.response_note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timing = commitmentTiming(followUp);
  const due = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(followUp.expected_response_at));
  const selectedEvidence = evidence.find(
    (item) => item.id === followUp.response_evidence_id,
  );

  return (
    <section aria-labelledby="follow-up-title" className="space-y-4">
      <div className="flex items-start gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full ${timing === "overdue" ? "bg-danger/10 text-danger" : "bg-soft-green text-deep-green"}`}
        >
          {timing === "resolved" ? (
            <CheckCircle2 className="size-5" />
          ) : timing === "overdue" ? (
            <AlertTriangle className="size-5" />
          ) : (
            <Clock3 className="size-5" />
          )}
        </span>
        <div>
          <h2 id="follow-up-title" className="font-semibold">
            Commitment follow-up
          </h2>
          <p className="text-muted mt-1 text-xs leading-5">
            {followUp.requested_commitment}
          </p>
        </div>
      </div>
      <div className="border-border bg-background rounded-lg border p-3 text-sm">
        <p className="font-semibold">{statusLabel(timing)}</p>
        <p className="text-muted mt-1 text-xs">Expected response: {due}</p>
        {followUp.reminder_count ? (
          <p className="text-muted mt-1 text-xs">
            {followUp.reminder_count} owner reminder
            {followUp.reminder_count === 1 ? "" : "s"} created
          </p>
        ) : null}
      </div>

      {followUp.status === "awaiting_response" ? (
        <div className="space-y-3">
          {candidateEvidence.length ? (
            <div className="bg-soft-green text-deep-green rounded-lg p-3 text-xs leading-5">
              <strong>Possible response detected.</strong>{" "}
              {candidateEvidence.length} new evidence source
              {candidateEvidence.length === 1 ? " was" : "s were"} added after
              this email was sent. Confirm the source below before resolving.
            </div>
          ) : (
            <p className="text-muted text-xs leading-5">
              No new risk evidence has arrived since this request was sent.
            </p>
          )}
          <label className="block text-xs font-semibold">
            Evidence that arrived
            <select
              aria-label="Response evidence"
              value={evidenceId}
              onChange={(event) => setEvidenceId(event.target.value)}
              className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 text-sm font-normal"
            >
              <option value="">Select verified source</option>
              {evidence.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Response note{" "}
            <span className="text-muted font-normal">(optional)</span>
            <textarea
              aria-label="Response note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="border-border bg-surface mt-2 w-full rounded-md border p-3 text-sm font-normal"
            />
          </label>
          <button
            disabled={pending || !evidenceId}
            onClick={() =>
              run(async () => {
                await recordCommitmentResponseAction({
                  followUpId: followUp.id,
                  evidenceId,
                  note,
                });
                setMessage(
                  "Response recorded. Verify the evidence before resolving.",
                );
              })
            }
            className="bg-deep-green min-h-11 w-full rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <FileCheck2 className="mr-2 inline size-4" /> Record response
            received
          </button>
          {timing === "overdue" && followUp.recommended_action_id ? (
            <Link
              href={`/risks/${followUp.risk_id}/email-draft?actionId=${followUp.recommended_action_id}&purpose=escalation`}
              className="border-border flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold"
            >
              Draft an escalation
            </Link>
          ) : null}
        </div>
      ) : null}

      {followUp.status === "response_received" ? (
        <div className="space-y-3">
          <div className="bg-soft-green rounded-lg p-3 text-sm">
            <p className="font-semibold">Evidence received, not yet verified</p>
            <p className="mt-1 text-xs">
              {selectedEvidence?.title ?? "Attached risk evidence"}
            </p>
          </div>
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                await verifyCommitmentResponseAction({
                  followUpId: followUp.id,
                });
                setMessage("Evidence verified and follow-up resolved.");
              })
            }
            className="bg-deep-green min-h-11 w-full rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Verify evidence & resolve
          </button>
          <p className="text-muted text-xs leading-5">
            If the linked action is already accepted or in progress, Sightline
            will complete it after verification.
          </p>
        </div>
      ) : null}

      {followUp.status === "resolved" ? (
        <p className="bg-soft-green text-deep-green rounded-lg p-3 text-sm font-semibold">
          Verified evidence closed this loop.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-deep-green text-xs font-semibold">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </section>
  );

  function run(work: () => Promise<void>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Follow-up could not be updated.",
        );
      }
    });
  }
}

function statusLabel(timing: ReturnType<typeof commitmentTiming>) {
  if (timing === "resolved") return "Resolved with verified evidence";
  if (timing === "received") return "Response received";
  if (timing === "overdue") return "Response overdue";
  if (timing === "due_today") return "Response due today";
  return "Awaiting response";
}
