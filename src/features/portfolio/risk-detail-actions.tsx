"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { acknowledgeRiskAction, dismissRiskAction } from "@/app/brief/actions";
import { updateRiskDetailAction } from "@/app/risks/[riskId]/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import {
  ReopenRiskControl,
  ResolutionWorkflow,
} from "@/features/resolutions/resolution-workflow";

export function RiskDetailActions({
  riskId,
  ownerId,
  dueAt,
  users,
  actions,
  exposureCents,
  status,
  closed,
}: {
  riskId: string;
  ownerId: string | null;
  dueAt: string | null;
  users: readonly { id: string; full_name: string }[];
  actions: readonly { id: string; title: string; status: string }[];
  exposureCents: number;
  status: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [dismissOpen, setDismissOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState(ownerId ?? "");
  const [selectedDueDate, setSelectedDueDate] = useState(
    dueAt?.slice(0, 10) ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<void>, rollback?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch {
        rollback?.();
        setError("The update could not be saved. Please try again.");
      }
    });
  }
  return (
    <section
      aria-label="Risk actions"
      className="border-border bg-surface mt-7 rounded-xl border p-5"
    >
      <div className="flex flex-wrap gap-3">
        <PrimaryButton
          disabled={pending || closed}
          onClick={() => run(() => acknowledgeRiskAction(riskId))}
        >
          Acknowledge
        </PrimaryButton>
        <SecondaryButton
          disabled={pending || closed}
          onClick={() => setDismissOpen(true)}
        >
          Dismiss
        </SecondaryButton>
        {!closed && (
          <ResolutionWorkflow
            riskId={riskId}
            ownerId={ownerId}
            users={users}
            actions={actions}
            exposureCents={exposureCents}
          />
        )}
        {status === "resolved" && <ReopenRiskControl riskId={riskId} />}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Owner
          <select
            value={selectedOwnerId}
            disabled={pending || closed}
            onChange={(event) => {
              const previousOwnerId = selectedOwnerId;
              const nextOwnerId = event.target.value;
              setSelectedOwnerId(nextOwnerId);
              run(
                () =>
                  updateRiskDetailAction({
                    kind: "assign",
                    riskId,
                    userId: nextOwnerId || null,
                  }),
                () => setSelectedOwnerId(previousOwnerId),
              );
            }}
            className="border-border mt-2 h-10 w-full rounded-md border px-3 font-normal"
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Due date
          <input
            type="date"
            value={selectedDueDate}
            disabled={pending || closed}
            onChange={(event) => {
              const previousDueDate = selectedDueDate;
              const nextDueDate = event.target.value;
              setSelectedDueDate(nextDueDate);
              run(
                () =>
                  updateRiskDetailAction({
                    kind: "due",
                    riskId,
                    dueDate: nextDueDate || null,
                  }),
                () => setSelectedDueDate(previousDueDate),
              );
            }}
            className="border-border mt-2 h-10 w-full rounded-md border px-3 font-normal"
          />
        </label>
      </div>
      {dismissOpen && (
        <div className="bg-background mt-5 rounded-lg border p-4">
          <label className="text-sm font-semibold">
            Dismissal reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              minLength={10}
              required
              className="border-border mt-2 w-full rounded-md border p-3 font-normal"
            />
          </label>
          <div className="mt-3 flex gap-3">
            <PrimaryButton
              disabled={pending}
              onClick={() => {
                if (reason.trim().length < 10) {
                  setError("Provide a reason of at least 10 characters.");
                  return;
                }
                run(async () => {
                  await dismissRiskAction({ riskId, reason });
                  setDismissOpen(false);
                });
              }}
            >
              Confirm dismissal
            </PrimaryButton>
            <SecondaryButton onClick={() => setDismissOpen(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
