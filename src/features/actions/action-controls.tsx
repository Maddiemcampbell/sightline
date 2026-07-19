"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Mail, Play, X } from "lucide-react";

import { mutateRecommendedAction } from "@/app/actions/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import type { ActionOwner, ActionView } from "@/features/actions/types";

export function ActionControls({
  initialAction,
  owners,
  compact = false,
}: {
  initialAction: ActionView;
  owners: readonly ActionOwner[];
  compact?: boolean;
}) {
  const [action, setAction] = useState(initialAction);
  const [persistedPriority, setPersistedPriority] = useState(
    initialAction.priority,
  );
  const [reason, setReason] = useState("");
  const [showDismiss, setShowDismiss] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const terminal =
    action.status === "completed" || action.status === "dismissed";

  function update(
    optimistic: ActionView,
    input: Parameters<typeof mutateRecommendedAction>[0],
  ) {
    const previous = action;
    setAction(optimistic);
    setError(null);
    startTransition(async () => {
      try {
        const row = await mutateRecommendedAction(input);
        setAction((current) => ({
          ...current,
          status: row.status,
          priority: row.priority,
          ownerUserId: row.owner_user_id,
          ownerName:
            owners.find((owner) => owner.id === row.owner_user_id)?.name ??
            null,
          dueAt: row.due_at,
          completedAt: row.completed_at,
          dismissedAt: row.dismissed_at,
          dismissalReason: row.dismissal_reason,
        }));
        setPersistedPriority(row.priority);
        setShowDismiss(false);
        setReason("");
      } catch (caught) {
        setAction(previous);
        setError(
          caught instanceof Error
            ? caught.message
            : "The action could not be updated.",
        );
      }
    });
  }

  return (
    <div
      className="space-y-3"
      data-action-id={action.id}
      data-pending={pending ? "true" : "false"}
      data-persisted-priority={persistedPriority}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-background rounded-full border px-2.5 py-1 font-semibold capitalize">
          {action.status.replace("_", " ")}
        </span>
        <span className="text-muted capitalize">
          {action.priority} priority
        </span>
        <span className="text-muted">{action.ownerName ?? "Unassigned"}</span>
        <span
          className={
            action.dueAt && new Date(action.dueAt) < new Date() && !terminal
              ? "text-danger font-semibold"
              : "text-muted"
          }
        >
          {action.dueAt
            ? `Due ${new Date(action.dueAt).toLocaleDateString()}`
            : "No due date"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/risks/${action.riskId}/email-draft?actionId=${action.id}`}
          className="border-border bg-surface text-ink hover:bg-background inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold"
        >
          <Mail className="size-4" /> Draft email
        </Link>
      </div>
      {!terminal && (
        <div className="flex flex-wrap gap-2">
          {action.status === "suggested" && (
            <PrimaryButton
              disabled={pending}
              onClick={() =>
                update(
                  { ...action, status: "accepted" },
                  { operation: "accept", actionId: action.id },
                )
              }
            >
              <Check className="size-4" /> Accept
            </PrimaryButton>
          )}
          {action.status === "accepted" && (
            <PrimaryButton
              disabled={pending}
              onClick={() =>
                update(
                  { ...action, status: "in_progress" },
                  { operation: "start", actionId: action.id },
                )
              }
            >
              <Play className="size-4" /> Start
            </PrimaryButton>
          )}
          {(action.status === "accepted" ||
            action.status === "in_progress") && (
            <SecondaryButton
              disabled={pending}
              onClick={() =>
                update(
                  {
                    ...action,
                    status: "completed",
                    completedAt: new Date().toISOString(),
                  },
                  { operation: "complete", actionId: action.id },
                )
              }
            >
              Complete
            </SecondaryButton>
          )}
          <SecondaryButton
            disabled={pending}
            aria-label={`Dismiss action: ${action.title}`}
            onClick={() => setShowDismiss(true)}
          >
            <X className="size-4" /> Dismiss
          </SecondaryButton>
        </div>
      )}
      {!terminal && !compact && (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-muted text-xs">
            Owner
            <select
              aria-label={`Owner for ${action.title}`}
              value={action.ownerUserId ?? ""}
              disabled={pending}
              onChange={(event) => {
                const ownerUserId = event.target.value || null;
                update(
                  {
                    ...action,
                    ownerUserId,
                    ownerName:
                      owners.find((owner) => owner.id === ownerUserId)?.name ??
                      null,
                  },
                  { operation: "assign", actionId: action.id, ownerUserId },
                );
              }}
              className="border-border bg-surface mt-1 block min-h-10 w-full rounded-md border px-2 text-sm"
            >
              <option value="">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-muted text-xs">
            Priority
            <select
              aria-label={`Priority for ${action.title}`}
              value={action.priority}
              disabled={pending}
              onChange={(event) => {
                const priority = event.target.value as ActionView["priority"];
                update(
                  { ...action, priority },
                  { operation: "priority", actionId: action.id, priority },
                );
              }}
              className="border-border bg-surface mt-1 block min-h-10 w-full rounded-md border px-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="text-muted text-xs">
            Due date
            <input
              aria-label={`Due date for ${action.title}`}
              type="date"
              value={action.dueAt?.slice(0, 10) ?? ""}
              disabled={pending}
              onChange={(event) => {
                const dueAt = event.target.value
                  ? new Date(
                      `${event.target.value}T17:00:00.000Z`,
                    ).toISOString()
                  : null;
                update(
                  { ...action, dueAt },
                  { operation: "due_date", actionId: action.id, dueAt },
                );
              }}
              className="border-border bg-surface mt-1 block min-h-10 w-full rounded-md border px-2 text-sm"
            />
          </label>
        </div>
      )}
      {showDismiss && (
        <div className="bg-background rounded-lg border p-3">
          <label className="text-sm font-semibold">
            Dismissal reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={3}
              required
              className="border-border bg-surface mt-2 block w-full rounded-md border p-2 font-normal"
            />
          </label>
          <PrimaryButton
            className="mt-2"
            disabled={pending || reason.trim().length < 3}
            onClick={() =>
              update(
                {
                  ...action,
                  status: "dismissed",
                  dismissedAt: new Date().toISOString(),
                  dismissalReason: reason,
                },
                { operation: "dismiss", actionId: action.id, reason },
              )
            }
          >
            Confirm dismissal
          </PrimaryButton>
        </div>
      )}
      {action.status === "dismissed" && action.dismissalReason && (
        <p className="text-muted text-sm">
          Dismissed: {action.dismissalReason}
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error} Your previous values were restored.
        </p>
      )}
    </div>
  );
}
