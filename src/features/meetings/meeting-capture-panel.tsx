"use client";

import { useActionState } from "react";

import {
  createMeetingFollowUpAction,
  recordMeetingDecisionAction,
  type MeetingActionState,
} from "@/app/meetings/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Option = Readonly<{ id: string; name: string }>;
type RiskOption = Readonly<{
  id: string;
  title: string;
  project_id: string | null;
}>;

export function MeetingCapturePanel({
  meetingId,
  projects,
  risks,
  owners,
}: {
  meetingId: string;
  projects: readonly Option[];
  risks: readonly RiskOption[];
  owners: readonly Option[];
}) {
  const [decisionState, decisionAction, decisionPending] = useActionState<
    MeetingActionState,
    FormData
  >(recordMeetingDecisionAction, {});
  const [followUpState, followUpAction, followUpPending] = useActionState<
    MeetingActionState,
    FormData
  >(createMeetingFollowUpAction, {});

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <h2 className="text-lg font-semibold">Record a decision</h2>
        <p className="text-muted mt-1 text-sm">
          Preserve the outcome and the context leadership used.
        </p>
        <form action={decisionAction} className="mt-5 grid gap-4">
          <input type="hidden" name="meetingId" value={meetingId} />
          <label className="grid gap-1 text-sm font-medium">
            Decision
            <textarea
              name="summary"
              required
              minLength={3}
              rows={3}
              className="border-border bg-background rounded-md border px-3 py-2"
              placeholder="What was decided?"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              name="projectId"
              label="Project (optional)"
              options={projects}
            />
            <Select
              name="riskId"
              label="Risk (optional)"
              options={risks.map((risk) => ({ id: risk.id, name: risk.title }))}
            />
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Rationale (optional)
            <textarea
              name="rationale"
              rows={2}
              className="border-border bg-background rounded-md border px-3 py-2"
              placeholder="Why was this decision made?"
            />
          </label>
          <Button type="submit" disabled={decisionPending}>
            {decisionPending ? "Recording…" : "Record decision"}
          </Button>
          <ActionMessage state={decisionState} />
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Create a follow-up</h2>
        <p className="text-muted mt-1 text-sm">
          Add an accepted action to the organization action register.
        </p>
        <form action={followUpAction} className="mt-5 grid gap-4">
          <input type="hidden" name="meetingId" value={meetingId} />
          <label className="grid gap-1 text-sm font-medium">
            Related risk
            <select
              name="riskId"
              required
              className="border-border bg-background h-11 rounded-md border px-3"
            >
              <option value="">Select a risk</option>
              {risks.map((risk) => (
                <option key={risk.id} value={risk.id}>
                  {risk.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Follow-up
            <input
              name="title"
              required
              minLength={3}
              className="border-border bg-background h-11 rounded-md border px-3"
              placeholder="Confirm recovery plan"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Definition of done
            <textarea
              name="description"
              required
              minLength={3}
              rows={2}
              className="border-border bg-background rounded-md border px-3 py-2"
              placeholder="What evidence confirms completion?"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select name="ownerUserId" label="Owner" options={owners} />
            <label className="grid gap-1 text-sm font-medium">
              Priority
              <select
                name="priority"
                defaultValue="normal"
                className="border-border bg-background h-11 rounded-md border px-3"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Due date
              <input
                name="dueAt"
                type="datetime-local"
                className="border-border bg-background h-11 rounded-md border px-3"
              />
            </label>
          </div>
          <Button type="submit" disabled={followUpPending}>
            {followUpPending ? "Creating…" : "Create follow-up action"}
          </Button>
          <ActionMessage state={followUpState} />
        </form>
      </Card>
    </div>
  );
}

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: readonly Option[];
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <select
        name={name}
        className="border-border bg-background h-11 rounded-md border px-3"
      >
        <option value="">Not specified</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionMessage({ state }: { state: MeetingActionState }) {
  if (!state.message && !state.error) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`text-sm ${state.error ? "text-danger" : "text-deep-green"}`}
    >
      {state.error ?? state.message}
    </p>
  );
}
