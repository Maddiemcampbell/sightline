"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  reopenRiskAction,
  resolveRiskAction,
} from "@/app/risks/[riskId]/actions";
import { RESOLUTION_TYPES } from "@/domain/resolutions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

type UserOption = { id: string; full_name: string };
type ActionOption = { id: string; title: string; status: string };

export function ResolutionWorkflow({
  riskId,
  ownerId,
  users,
  actions,
  exposureCents,
}: {
  riskId: string;
  ownerId: string | null;
  users: readonly UserOption[];
  actions: readonly ActionOption[];
  exposureCents: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await resolveRiskAction({
          riskId,
          summary: data.get("summary"),
          resolutionType: data.get("resolutionType"),
          finalOwnerUserId: data.get("finalOwnerUserId"),
          resolvedDate: data.get("resolvedDate"),
          completedActionIds: data.getAll("completedActionIds"),
          exposureBeforeCents: dollarsToCents(data.get("exposureBefore")),
          remainingExposureCents: dollarsToCents(data.get("remainingExposure")),
          estimatedLossAvoidedCents: dollarsToCents(data.get("lossAvoided")),
          warningUseful: data.get("warningUseful") === "true",
          predictionAccurate: data.get("predictionAccurate") === "true",
          internalNotes: String(data.get("internalNotes") ?? "").trim() || null,
        });
        setOpen(false);
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The resolution could not be saved.",
        );
      }
    });
  }

  return (
    <>
      <SecondaryButton disabled={!users.length} onClick={() => setOpen(true)}>
        Resolve with details
      </SecondaryButton>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:py-10">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolution-title"
            className="bg-surface w-full max-w-3xl rounded-2xl border p-6 shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-muted text-xs font-semibold uppercase">
                  Guided resolution
                </p>
                <h2
                  id="resolution-title"
                  className="mt-1 text-2xl font-semibold"
                >
                  Record what happened
                </h2>
                <p className="text-muted mt-2 text-sm">
                  Monetary values are estimates. This record does not claim that
                  Sightline caused the outcome.
                </p>
              </div>
              <button
                type="button"
                className="text-muted min-h-10 px-2 text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <form onSubmit={submit} className="mt-6 space-y-5">
              <label className="block text-sm font-semibold">
                Resolution summary
                <textarea
                  name="summary"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={4}
                  className={inputClass}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField name="resolutionType" label="Resolution type">
                  {RESOLUTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {label(type)}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  name="finalOwnerUserId"
                  label="Final owner"
                  defaultValue={ownerId ?? users[0]?.id}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </SelectField>
                <label className="text-sm font-semibold">
                  Resolved date
                  <input
                    name="resolvedDate"
                    type="date"
                    required
                    max={today}
                    defaultValue={today}
                    className={inputClass}
                  />
                </label>
              </div>
              <fieldset>
                <legend className="text-sm font-semibold">
                  Actions completed
                </legend>
                <div className="border-border mt-2 space-y-2 rounded-lg border p-3">
                  {actions.length ? (
                    actions.map((action) => (
                      <label key={action.id} className="flex gap-3 text-sm">
                        <input
                          type="checkbox"
                          name="completedActionIds"
                          value={action.id}
                          defaultChecked={action.status === "completed"}
                        />
                        <span>{action.title}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-muted text-sm">
                      No actions were attached.
                    </p>
                  )}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-3">
                <MoneyField
                  name="exposureBefore"
                  label="Estimated exposure before"
                  defaultValue={(exposureCents / 100).toFixed(2)}
                />
                <MoneyField
                  name="remainingExposure"
                  label="Estimated remaining exposure"
                  defaultValue="0.00"
                />
                <MoneyField
                  name="lossAvoided"
                  label="Estimated loss avoided"
                  defaultValue="0.00"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <BooleanField
                  name="warningUseful"
                  label="Was Sightline’s warning useful?"
                />
                <BooleanField
                  name="predictionAccurate"
                  label="Was the original prediction accurate?"
                />
              </div>
              <label className="block text-sm font-semibold">
                Internal notes{" "}
                <span className="text-muted font-normal">(optional)</span>
                <textarea
                  name="internalNotes"
                  maxLength={5000}
                  rows={3}
                  className={inputClass}
                />
              </label>
              {error && (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <SecondaryButton type="button" onClick={() => setOpen(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={pending}>
                  {pending ? "Saving resolution…" : "Resolve risk"}
                </PrimaryButton>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function ReopenRiskControl({ riskId }: { riskId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <SecondaryButton onClick={() => setOpen(true)}>
        Reopen risk
      </SecondaryButton>
      {open && (
        <div className="bg-background mt-4 rounded-lg border p-4">
          <label className="text-sm font-semibold">
            Reason for reopening
            <textarea
              aria-label="Reason for reopening"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              required
              rows={3}
              className={inputClass}
            />
          </label>
          {error && (
            <p role="alert" className="text-danger mt-2 text-sm">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-3">
            <PrimaryButton
              disabled={pending}
              onClick={() => {
                if (reason.trim().length < 10) {
                  setError("Provide a reason of at least 10 characters.");
                  return;
                }
                startTransition(async () => {
                  try {
                    await reopenRiskAction({ riskId, reason });
                    setOpen(false);
                    router.refresh();
                  } catch (caught) {
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : "The risk could not be reopened.",
                    );
                  }
                });
              }}
            >
              Confirm reopening
            </PrimaryButton>
            <SecondaryButton onClick={() => setOpen(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

function dollarsToCents(value: FormDataEntryValue | null) {
  return Math.round(Number(value) * 100);
}

const inputClass =
  "border-border mt-2 min-h-10 w-full rounded-md border bg-surface px-3 py-2 font-normal";

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function SelectField({
  name,
  label: fieldLabel,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-semibold">
      {fieldLabel}
      <select
        name={name}
        required
        defaultValue={defaultValue}
        className={inputClass}
      >
        {children}
      </select>
    </label>
  );
}

function MoneyField({
  name,
  label: fieldLabel,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {fieldLabel}
      <span className="relative block">
        <span className="text-muted absolute top-4 left-3">$</span>
        <input
          name={name}
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={defaultValue}
          className={`${inputClass} pl-7`}
        />
      </span>
    </label>
  );
}

function BooleanField({
  name,
  label: fieldLabel,
}: {
  name: string;
  label: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {fieldLabel}
      <select name={name} required className={inputClass} defaultValue="true">
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}
