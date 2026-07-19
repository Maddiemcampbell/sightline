"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileText, ShieldCheck, X } from "lucide-react";

import { acknowledgeRiskAction, dismissRiskAction } from "@/app/brief/actions";
import { RiskBadge } from "@/components/ui/badge";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { formatMoney } from "@/features/daily-brief/formatters";
import type { BriefRiskView } from "@/features/daily-brief/types";
import { ActionControls } from "@/features/actions/action-controls";
import type { ActionOwner } from "@/features/actions/types";

export function BriefRiskCard({
  risk,
  actionOwners,
}: {
  risk: BriefRiskView;
  actionOwners: readonly ActionOwner[];
}) {
  const [acknowledged, setAcknowledged] = useState(risk.acknowledged);
  const [acknowledgementPersisted, setAcknowledgementPersisted] = useState(
    risk.acknowledged,
  );
  const [dismissOpen, setDismissOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (hidden) return null;

  function acknowledge() {
    const previous = acknowledged;
    setAcknowledged(true);
    setError(null);
    startTransition(async () => {
      try {
        await acknowledgeRiskAction(risk.id);
        setAcknowledgementPersisted(true);
      } catch {
        setAcknowledged(previous);
        setError("We couldn’t save that acknowledgement. Please try again.");
      }
    });
  }

  function dismiss() {
    if (reason.trim().length < 10) {
      setError("Please provide a reason of at least 10 characters.");
      return;
    }
    setHidden(true);
    setError(null);
    startTransition(async () => {
      try {
        await dismissRiskAction({ riskId: risk.id, reason });
      } catch {
        setHidden(false);
        setError(
          "We couldn’t dismiss this risk. Your brief has been restored.",
        );
      }
    });
  }

  const badgeLevel =
    risk.severity === "critical"
      ? "high"
      : risk.severity === "high"
        ? "high"
        : risk.severity === "medium"
          ? "medium"
          : "low";

  return (
    <article
      className="border-border bg-surface overflow-hidden rounded-xl border"
      aria-labelledby={`risk-${risk.id}`}
      data-acknowledgement-persisted={
        acknowledgementPersisted ? "true" : "false"
      }
    >
      <div className="border-border flex items-start gap-4 border-b p-5 sm:p-6">
        <div
          className="bg-deep-green flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          aria-label={`Priority ${risk.priority}`}
        >
          {risk.priority}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <RiskBadge level={badgeLevel}>
              {risk.severity === "critical"
                ? "Critical"
                : `${risk.severity[0]?.toUpperCase()}${risk.severity.slice(1)}`}
            </RiskBadge>
            {acknowledged && (
              <span
                role="status"
                className="bg-soft-green text-deep-green inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              >
                <Check className="size-3.5" /> Acknowledged
              </span>
            )}
          </div>
          <h2
            id={`risk-${risk.id}`}
            className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl"
          >
            {risk.title}
          </h2>
          <Link
            href={`/projects/${risk.projectId}`}
            className="text-muted hover:text-deep-green mt-2 inline-block text-sm font-medium"
          >
            {risk.projectName} · {risk.projectSubtitle}
          </Link>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            Margin impact
          </p>
          <p className="mt-1 text-xl font-semibold">
            {formatMoney(risk.marginImpactCents)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {formatMoney(risk.exposureCents)} exposure
          </p>
        </div>
      </div>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        <section>
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            Why it matters
          </p>
          <p className="mt-2 text-sm leading-6">{risk.whyItMatters}</p>
          <div className="bg-background mt-5 rounded-lg border p-4">
            <div className="text-deep-green flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4" /> {risk.evidenceTitle}
            </div>
            <p className="text-muted mt-2 text-sm leading-5">
              “{risk.evidenceDetail}”
            </p>
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-semibold tracking-wide uppercase">
              Confidence
            </p>
            <span className="text-sm font-semibold">
              {risk.confidenceScore}%
            </span>
          </div>
          <div className="bg-border mt-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-accent-strong h-full rounded-full"
              style={{ width: `${risk.confidenceScore}%` }}
            />
          </div>
          <div className="bg-soft-green mt-5 rounded-lg p-4">
            <div className="text-deep-green flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4" /> Recommended next action
            </div>
            <p className="mt-2 text-sm leading-5">{risk.recommendedAction}</p>
            {risk.primaryAction && (
              <div className="border-deep-green/20 mt-3 border-t pt-3">
                <ActionControls
                  initialAction={risk.primaryAction}
                  owners={actionOwners}
                  compact
                />
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="border-border flex flex-wrap items-center gap-3 border-t px-5 py-4 sm:px-6">
        <PrimaryButton
          onClick={acknowledge}
          disabled={acknowledged || isPending}
        >
          {acknowledged ? (
            <>
              <Check className="size-4" /> Acknowledged
            </>
          ) : (
            "Acknowledge"
          )}
        </PrimaryButton>
        <SecondaryButton
          onClick={() => {
            setDismissOpen(true);
            setError(null);
          }}
          disabled={isPending}
        >
          Dismiss
        </SecondaryButton>
        <Link
          href={`/risks/${risk.id}`}
          className="text-deep-green ml-auto inline-flex min-h-10 items-center gap-2 text-sm font-semibold hover:underline"
        >
          View full risk <ArrowRight className="size-4" />
        </Link>
        {error && (
          <p role="alert" className="text-danger w-full text-sm">
            {error}
          </p>
        )}
      </div>
      {dismissOpen && (
        <div className="border-border bg-background border-t p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">
                Why are you dismissing this risk?
              </h3>
              <p className="text-muted mt-1 text-sm">
                This reason will be saved to the risk activity history.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close dismissal form"
              onClick={() => setDismissOpen(false)}
              className="text-muted hover:text-ink rounded-md p-1"
            >
              <X className="size-5" />
            </button>
          </div>
          <label htmlFor={`dismiss-${risk.id}`} className="sr-only">
            Dismissal reason
          </label>
          <textarea
            id={`dismiss-${risk.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={10}
            rows={3}
            placeholder="Enter a specific reason…"
            className="border-border bg-surface mt-4 w-full rounded-lg border p-3 text-sm focus-visible:outline-none"
          />
          <div className="mt-3 flex gap-3">
            <PrimaryButton onClick={dismiss} disabled={isPending}>
              Confirm dismissal
            </PrimaryButton>
            <SecondaryButton onClick={() => setDismissOpen(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </div>
      )}
    </article>
  );
}
