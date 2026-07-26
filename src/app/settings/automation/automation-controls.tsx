"use client";

import { useActionState } from "react";

import {
  type AutomationActionState,
  generateDailyBriefNowAction,
  refreshPortfolioNowAction,
  updateAutomationScheduleAction,
} from "@/app/settings/automation/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

const INITIAL_STATE: AutomationActionState = { message: "" };

export function AutomationScheduleForm({
  schedule,
}: {
  schedule: {
    portfolioEnabled: boolean;
    portfolioTime: string;
    briefEnabled: boolean;
    briefTime: string;
    maxAttempts: number;
    timezone: string;
  };
}) {
  const [state, action, pending] = useActionState(
    updateAutomationScheduleAction,
    INITIAL_STATE,
  );
  return (
    <form action={action} className="space-y-5">
      <ScheduleToggle
        name="portfolioEnabled"
        label="Scheduled Portfolio Intelligence refresh"
        description="Recalculate observations, risk chains, and analytics snapshots daily."
        defaultChecked={schedule.portfolioEnabled}
      />
      <TimeField
        name="portfolioTime"
        label="Portfolio refresh time"
        defaultValue={schedule.portfolioTime.slice(0, 5)}
      />
      <ScheduleToggle
        name="briefEnabled"
        label="Scheduled Daily Executive Brief"
        description="Generate today’s brief and deliver it to enabled recipients."
        defaultChecked={schedule.briefEnabled}
      />
      <TimeField
        name="briefTime"
        label="Daily Brief time"
        defaultValue={schedule.briefTime.slice(0, 5)}
      />
      <label className="block text-sm font-semibold">
        Maximum attempts
        <input
          name="maxAttempts"
          type="number"
          min={1}
          max={10}
          defaultValue={schedule.maxAttempts}
          className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
        />
      </label>
      <p className="text-muted text-xs">
        Times use {schedule.timezone}. Failed work retries after an increasing
        delay and alerts organization administrators.
      </p>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save automation schedule"}
      </PrimaryButton>
      <ActionMessage state={state} />
    </form>
  );
}

export function ManualJobControls() {
  const [portfolioState, portfolioAction, portfolioPending] = useActionState(
    refreshPortfolioNowAction,
    INITIAL_STATE,
  );
  const [briefState, briefAction, briefPending] = useActionState(
    generateDailyBriefNowAction,
    INITIAL_STATE,
  );
  return (
    <div className="space-y-4">
      <form action={portfolioAction}>
        <SecondaryButton type="submit" disabled={portfolioPending}>
          {portfolioPending ? "Refreshing…" : "Refresh portfolio now"}
        </SecondaryButton>
        <ActionMessage state={portfolioState} />
      </form>
      <form action={briefAction}>
        <SecondaryButton type="submit" disabled={briefPending}>
          {briefPending ? "Generating…" : "Generate and deliver brief now"}
        </SecondaryButton>
        <ActionMessage state={briefState} />
      </form>
    </div>
  );
}

function ScheduleToggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="border-border flex gap-3 rounded-md border p-4">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 size-4"
      />
      <span>
        <strong className="block text-sm">{label}</strong>
        <span className="text-muted text-xs">{description}</span>
      </span>
    </label>
  );
}

function TimeField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        name={name}
        type="time"
        required
        defaultValue={defaultValue}
        className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
      />
    </label>
  );
}

function ActionMessage({ state }: { state: AutomationActionState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-deep-green mt-3 text-sm font-semibold">
          {state.message}
        </p>
      )}
    </>
  );
}
