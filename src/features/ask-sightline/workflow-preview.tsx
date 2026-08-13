"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  FileText,
  Mail,
  Plus,
  Presentation,
  RefreshCw,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
  PencilLine,
  ShieldCheck,
  X,
} from "lucide-react";

import { useSharedAsk } from "@/features/ask-sightline/shared-ask-provider";
import type {
  AskWorkflowActionItem,
  AskWorkflowProposal,
  SharedAskMessage,
} from "@/features/ask-sightline/shared-types";
import { useWorkspaceResources } from "@/features/workspace/workspace-provider";

const statusLabels: Record<AskWorkflowProposal["status"], string> = {
  suggested: "Suggested",
  ready_for_review: "Ready for review",
  approved: "Approved",
  created: "Created",
  failed: "Needs attention",
};
const reportSections = [
  "Executive summary",
  "Projects needing attention",
  "Forecast and data confidence",
  "Top risks and overdue actions",
  "Decisions required",
] as const;

export function WorkflowPreview({ message }: { message: SharedAskMessage }) {
  const proposal = message.workflowProposal;
  const { updateWorkflowProposal, applyWorkflowProposal, applyingProposalId } =
    useSharedAsk();
  const { searchResources } = useWorkspaceResources();
  if (!proposal) return null;
  const applying = applyingProposalId === proposal.id;

  if (proposal.command !== "/action")
    return (
      <ConfiguredWorkflowPreview
        message={message}
        proposal={proposal}
        applying={applying}
      />
    );

  const risks = searchResources.filter((resource) => resource.type === "risk");
  const owners = searchResources.filter((resource) => resource.type === "user");
  const selected = proposal.items.filter(
    (item) => item.selected && item.status !== "created",
  );
  const selectedAreValid =
    selected.length > 0 && selected.every(isActionItemValid);
  const editable = !applying && proposal.status !== "created";

  function saveItems(items: readonly AskWorkflowActionItem[]) {
    const active = items.filter(
      (item) => item.selected && item.status !== "created",
    );
    updateWorkflowProposal(message.id, {
      ...proposal!,
      status:
        active.length > 0 && active.every(isActionItemValid)
          ? "ready_for_review"
          : "suggested",
      items,
    });
  }

  function updateItem(itemId: string, patch: Partial<AskWorkflowActionItem>) {
    saveItems(
      proposal!.items.map((item) =>
        item.id === itemId
          ? { ...item, ...patch, status: "suggested", error: null }
          : item,
      ),
    );
  }

  function createAll() {
    const allSelected: AskWorkflowProposal = {
      ...proposal!,
      status: proposal!.items.every(isActionItemValid)
        ? "ready_for_review"
        : "suggested",
      items: proposal!.items.map((item) => ({ ...item, selected: true })),
    };
    updateWorkflowProposal(message.id, allSelected);
    if (allSelected.items.every(isActionItemValid))
      applyWorkflowProposal(message.id, allSelected);
  }

  return (
    <section
      aria-label="Workflow preview"
      className="border-accent-strong bg-soft-green mt-5 overflow-hidden rounded-xl border"
    >
      <div className="p-4 sm:p-5">
        <ProposalHeader proposal={proposal} applying={applying} />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Review proposed actions</h3>
            <p className="text-muted mt-1 max-w-2xl text-xs leading-5">
              Edit the details, choose what to create, then approve. Nothing is
              written to Sightline until you confirm.
            </p>
          </div>
          <span className="bg-surface rounded-full px-3 py-1 text-xs font-semibold">
            {proposal.items.filter((item) => item.selected).length} selected
          </span>
        </div>
      </div>

      <div className="border-accent-strong/30 divide-accent-strong/20 divide-y border-y">
        {proposal.items.map((item, index) => {
          const locked = !editable || item.status === "created";
          return (
            <article key={item.id} className="bg-surface/80 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <label className="relative mt-1 grid size-6 shrink-0 cursor-pointer place-items-center">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={locked}
                    onChange={(event) =>
                      updateItem(item.id, { selected: event.target.checked })
                    }
                    className="peer absolute inset-0 cursor-pointer opacity-0"
                    aria-label={`Select proposed action ${index + 1}`}
                  />
                  <span className="border-border peer-checked:bg-deep-green peer-checked:border-deep-green peer-focus-visible:ring-accent pointer-events-none grid size-5 place-items-center rounded border-2 text-transparent peer-checked:text-white peer-focus-visible:ring-2">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-muted text-xs font-semibold uppercase">
                      Proposed action {index + 1}
                    </p>
                    <ItemStatus item={item} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Action" className="sm:col-span-2">
                      <input
                        value={item.title}
                        disabled={locked}
                        maxLength={240}
                        onChange={(event) =>
                          updateItem(item.id, { title: event.target.value })
                        }
                        className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm disabled:opacity-70"
                      />
                    </Field>
                    <Field label="Related risk">
                      <select
                        value={item.riskId}
                        disabled={locked}
                        onChange={(event) => {
                          const risk = risks.find(
                            (candidate) => candidate.id === event.target.value,
                          );
                          updateItem(item.id, {
                            riskId: event.target.value,
                            riskTitle: risk?.title ?? "Select a related risk",
                          });
                        }}
                        className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm disabled:opacity-70"
                      >
                        <option value="">Select a risk</option>
                        {risks.map((risk) => (
                          <option key={risk.id} value={risk.id}>
                            {risk.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Owner">
                      <select
                        value={item.ownerUserId ?? ""}
                        disabled={locked}
                        onChange={(event) =>
                          updateItem(item.id, {
                            ownerUserId: event.target.value || null,
                          })
                        }
                        className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm disabled:opacity-70"
                      >
                        <option value="">Unassigned</option>
                        {owners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select
                        value={item.priority}
                        disabled={locked}
                        onChange={(event) =>
                          updateItem(item.id, {
                            priority: event.target
                              .value as AskWorkflowActionItem["priority"],
                          })
                        }
                        className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm capitalize disabled:opacity-70"
                      >
                        {(["low", "normal", "high", "urgent"] as const).map(
                          (priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                    <Field label="Due date">
                      <input
                        type="date"
                        value={item.dueDate}
                        disabled={locked}
                        onChange={(event) =>
                          updateItem(item.id, { dueDate: event.target.value })
                        }
                        className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm disabled:opacity-70"
                      />
                    </Field>
                    <Field label="Definition of done" className="sm:col-span-2">
                      <textarea
                        value={item.description}
                        disabled={locked}
                        rows={2}
                        maxLength={2000}
                        onChange={(event) =>
                          updateItem(item.id, {
                            description: event.target.value,
                          })
                        }
                        className="border-border bg-background w-full resize-y rounded-md border p-3 text-sm disabled:opacity-70"
                      />
                    </Field>
                  </div>
                  {item.evidenceHref && item.evidenceTitle ? (
                    <Link
                      href={item.evidenceHref}
                      className="text-deep-green mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                    >
                      Evidence: {item.evidenceTitle}
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                  {item.error ? (
                    <p role="alert" className="text-danger mt-2 text-xs">
                      {item.error}
                    </p>
                  ) : null}
                  {item.status === "created" && item.createdActionId ? (
                    <Link
                      href={`/actions?focus=${item.createdActionId}`}
                      className="text-deep-green mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      Open created action
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                  {editable && item.status !== "created" ? (
                    <button
                      type="button"
                      onClick={() =>
                        saveItems([
                          ...proposal.items.slice(0, index + 1),
                          {
                            ...item,
                            id: crypto.randomUUID(),
                            status: "suggested",
                            createdActionId: null,
                            error: null,
                          },
                          ...proposal.items.slice(index + 1),
                        ])
                      }
                      className="border-border bg-surface mt-3 inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
                    >
                      Duplicate
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="text-muted flex items-center gap-2 text-xs">
          <ShieldCheck className="text-deep-green size-4" aria-hidden="true" />
          Permission and project access are checked again when you approve.
        </div>
        <div className="flex flex-wrap gap-2">
          {editable ? (
            <button
              type="button"
              onClick={() =>
                saveItems([
                  ...proposal.items,
                  {
                    id: crypto.randomUUID(),
                    selected: true,
                    status: "suggested",
                    title: "Follow-up action",
                    description:
                      "Confirm the outcome and attach evidence when complete.",
                    riskId: "",
                    riskTitle: "Select a related risk",
                    ownerUserId: null,
                    priority: "normal",
                    dueDate: "",
                    evidenceTitle: null,
                    evidenceHref: null,
                    createdActionId: null,
                    error: null,
                  },
                ])
              }
              className="border-border bg-surface inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
            >
              <Plus className="size-3.5" aria-hidden="true" /> Add action
            </button>
          ) : null}
          {proposal.items.some((item) => item.status === "failed") &&
          editable ? (
            <button
              type="button"
              onClick={() =>
                saveItems(
                  proposal.items.map((item) =>
                    item.status === "failed"
                      ? {
                          ...item,
                          selected: true,
                          status: "suggested",
                          error: null,
                        }
                      : { ...item, selected: false },
                  ),
                )
              }
              className="border-border bg-surface inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" /> Retry failed
            </button>
          ) : null}
          {editable ? (
            <button
              type="button"
              onClick={() =>
                saveItems(
                  proposal.items.map((item) => ({ ...item, selected: false })),
                )
              }
              className="border-border bg-surface inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
            >
              <X className="size-3.5" aria-hidden="true" /> Select none
            </button>
          ) : null}
          {editable && proposal.items.some((item) => !item.selected) ? (
            <button
              type="button"
              onClick={() =>
                saveItems(
                  proposal.items.map((item) => ({ ...item, selected: true })),
                )
              }
              className="border-border bg-surface inline-flex min-h-10 items-center rounded-md border px-3 text-xs font-semibold"
            >
              Select all
            </button>
          ) : null}
          {proposal.items.length > 1 && editable ? (
            <button
              type="button"
              disabled={!proposal.items.every(isActionItemValid)}
              onClick={createAll}
              className="border-deep-green text-deep-green bg-surface inline-flex min-h-10 items-center rounded-md border px-3 text-xs font-semibold disabled:opacity-50"
            >
              Create all
            </button>
          ) : null}
          {proposal.status !== "created" ? (
            <button
              type="button"
              disabled={!selectedAreValid || applying}
              onClick={() => applyWorkflowProposal(message.id)}
              className="bg-deep-green inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              {applying ? (
                <LoaderCircle
                  className="size-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
              )}
              {applying ? "Creating…" : "Approve & create selected"}
            </button>
          ) : (
            <Link
              href="/actions"
              className="bg-deep-green inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-xs font-semibold text-white"
            >
              View created actions
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function ConfiguredWorkflowPreview({
  message,
  proposal,
  applying,
}: {
  message: SharedAskMessage;
  proposal: AskWorkflowProposal;
  applying: boolean;
}) {
  const { updateWorkflowProposal, applyWorkflowProposal } = useSharedAsk();
  const { projects, searchResources } = useWorkspaceResources();
  const configuration = proposal.configuration;
  const editable = proposal.status !== "created" && !applying;
  const risks = searchResources.filter((resource) => resource.type === "risk");
  const save = (next: NonNullable<AskWorkflowProposal["configuration"]>) =>
    updateWorkflowProposal(message.id, {
      ...proposal,
      status: "ready_for_review",
      configuration: next,
    });

  if (!configuration) return <GenericHandoff proposal={proposal} />;

  const canCreate =
    (configuration.kind === "meeting" &&
      configuration.title.trim().length >= 3 &&
      configuration.startsAt.length > 0) ||
    (configuration.kind === "email" &&
      configuration.riskId.length > 0 &&
      configuration.recipientRole.trim().length >= 2 &&
      configuration.subjectPreview.trim().length > 0 &&
      configuration.bodyPreview.trim().length > 0);
  const isDirect =
    configuration.kind === "meeting" || configuration.kind === "email";

  return (
    <section
      aria-label="Workflow preview"
      className="border-accent-strong bg-soft-green mt-5 overflow-hidden rounded-xl border"
    >
      <div className="p-4 sm:p-5">
        <ProposalHeader proposal={proposal} applying={applying} />
        <div className="mt-4 flex items-start gap-3">
          <span className="bg-surface text-deep-green grid size-9 shrink-0 place-items-center rounded-lg">
            {configuration.kind === "meeting" ? (
              <Presentation className="size-4" />
            ) : configuration.kind === "email" ? (
              <Mail className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
          </span>
          <div>
            <h3 className="font-semibold">{proposal.title}</h3>
            <p className="text-muted mt-1 text-xs leading-5">
              {proposal.effect}
            </p>
          </div>
        </div>
      </div>
      <div className="border-accent-strong/30 bg-surface/85 border-y p-4 sm:p-5">
        {configuration.kind === "meeting" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meeting title" className="sm:col-span-2">
              <input
                value={configuration.title}
                disabled={!editable}
                onChange={(e) =>
                  save({ ...configuration, title: e.target.value })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              />
            </Field>
            <Field label="Meeting type">
              <select
                value={configuration.meetingType}
                disabled={!editable}
                onChange={(e) =>
                  save({
                    ...configuration,
                    meetingType: e.target
                      .value as typeof configuration.meetingType,
                  })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="weekly_executive_review">
                  Weekly executive review
                </option>
                <option value="monthly_portfolio_review">
                  Monthly portfolio review
                </option>
                <option value="project_owner_meeting">
                  Project owner meeting
                </option>
                <option value="lender_board_update">
                  Lender or board update
                </option>
                <option value="risk_committee_briefing">
                  Risk committee briefing
                </option>
              </select>
            </Field>
            <Field label="Date and time">
              <input
                type="datetime-local"
                value={configuration.startsAt}
                disabled={!editable}
                onChange={(e) =>
                  save({ ...configuration, startsAt: e.target.value })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              />
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="text-xs font-semibold">Project scope</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => save({ ...configuration, projectIds: [] })}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${configuration.projectIds.length === 0 ? "border-deep-green bg-soft-green" : "border-border bg-background"}`}
                >
                  All accessible
                </button>
                {projects.map((project) => {
                  const selected = configuration.projectIds.includes(
                    project.id,
                  );
                  return (
                    <button
                      key={project.id}
                      type="button"
                      disabled={!editable}
                      aria-pressed={selected}
                      onClick={() =>
                        save({
                          ...configuration,
                          projectIds: selected
                            ? configuration.projectIds.filter(
                                (id) => id !== project.id,
                              )
                            : [...configuration.projectIds, project.id],
                        })
                      }
                      className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${selected ? "border-deep-green bg-soft-green" : "border-border bg-background"}`}
                    >
                      {project.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="border-border bg-background rounded-lg border p-3 sm:col-span-2">
              <p className="text-deep-green text-xs font-semibold tracking-wide uppercase">
                Agenda preview
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {configuration.agendaPreview.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <p className="text-muted mt-2 text-xs">
                Sightline generates the final evidence-linked agenda when the
                meeting is created.
              </p>
            </div>
          </div>
        ) : configuration.kind === "email" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Related risk">
              <select
                value={configuration.riskId}
                disabled={!editable}
                onChange={(e) =>
                  save({ ...configuration, riskId: e.target.value })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Select a risk</option>
                {risks.map((risk) => (
                  <option key={risk.id} value={risk.id}>
                    {risk.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Recipient role">
              <input
                value={configuration.recipientRole}
                disabled={!editable}
                onChange={(e) =>
                  save({ ...configuration, recipientRole: e.target.value })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              />
            </Field>
            <Field label="Tone">
              <select
                value={configuration.tone}
                disabled={!editable}
                onChange={(e) =>
                  save({
                    ...configuration,
                    tone: e.target.value as typeof configuration.tone,
                  })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              >
                {["concise", "collaborative", "firm", "formal"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Purpose">
              <select
                value={configuration.purpose}
                disabled={!editable}
                onChange={(e) =>
                  save({
                    ...configuration,
                    purpose: e.target.value as typeof configuration.purpose,
                  })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="initial_request">Initial request</option>
                <option value="reminder">Reminder</option>
                <option value="escalation">Escalation</option>
                <option value="status_update">Status update</option>
              </select>
            </Field>
            <div className="border-border bg-background rounded-lg border p-3 sm:col-span-2">
              <p className="text-deep-green text-xs font-semibold tracking-wide uppercase">
                Editable email preview
              </p>
              <label className="mt-3 grid gap-1.5 text-xs font-semibold">
                Subject
                <input
                  value={configuration.subjectPreview}
                  disabled={!editable}
                  maxLength={240}
                  onChange={(event) =>
                    save({
                      ...configuration,
                      subjectPreview: event.target.value,
                    })
                  }
                  className="border-border bg-surface min-h-10 rounded-md border px-3 text-sm font-normal"
                />
              </label>
              <label className="mt-3 grid gap-1.5 text-xs font-semibold">
                Body
                <textarea
                  value={configuration.bodyPreview}
                  disabled={!editable}
                  maxLength={10_000}
                  rows={7}
                  onChange={(event) =>
                    save({
                      ...configuration,
                      bodyPreview: event.target.value,
                    })
                  }
                  className="border-border bg-surface resize-y rounded-md border p-3 text-sm leading-6 font-normal"
                />
              </label>
              <p className="text-muted mt-2 text-xs">
                Sightline grounds the initial draft in authorized evidence. Your
                edits are saved to the draft, and it is never sent
                automatically.
              </p>
            </div>
          </div>
        ) : configuration.kind === "scenario" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Scenario name">
              <input
                value={configuration.name}
                disabled={!editable}
                onChange={(event) =>
                  save({ ...configuration, name: event.target.value })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              />
            </Field>
            <Field label="Project">
              <select
                value={configuration.projectId}
                disabled={!editable}
                onChange={(event) =>
                  save({ ...configuration, projectId: event.target.value })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assumption">
              <select
                value={configuration.assumption}
                disabled={!editable}
                onChange={(event) =>
                  save({
                    ...configuration,
                    assumption: event.target
                      .value as typeof configuration.assumption,
                  })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="reject_pending_change_orders">
                  Pending change orders are rejected
                </option>
                <option value="cost_to_complete_increase">
                  Remaining cost increases
                </option>
                <option value="completion_delay">
                  Completion moves four weeks later
                </option>
              </select>
            </Field>
            {configuration.assumption === "cost_to_complete_increase" ? (
              <Field label="Cost increase">
                <select
                  value={configuration.costIncreasePercent}
                  disabled={!editable}
                  onChange={(event) =>
                    save({
                      ...configuration,
                      costIncreasePercent: Number(event.target.value),
                    })
                  }
                  className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
                >
                  {[5, 10, 15, 20].map((value) => (
                    <option key={value} value={value}>
                      {value}%
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <div className="border-border bg-background rounded-lg border p-3 sm:col-span-2">
              <p className="text-deep-green text-xs font-semibold uppercase">
                Comparison guardrail
              </p>
              <p className="mt-2 text-sm leading-6">
                The workspace will compare baseline and proposed values. This
                named assumption remains part of the conversation and never
                changes the official forecast.
              </p>
            </div>
          </div>
        ) : configuration.kind === "deck" || configuration.kind === "report" ? (
          <div className="space-y-4">
            <Field
              label={
                configuration.kind === "deck" ? "Deck template" : "Report type"
              }
            >
              <select
                value={configuration.template}
                disabled={!editable}
                onChange={(e) =>
                  save({ ...configuration, template: e.target.value })
                }
                className="border-border bg-background min-h-10 w-full rounded-md border px-3 text-sm"
              >
                {configuration.kind === "deck" ? (
                  <>
                    <option value="weekly-executive-review">
                      Weekly executive review
                    </option>
                    <option value="monthly-portfolio-review">
                      Monthly portfolio review
                    </option>
                    <option value="project-owner-meeting">
                      Project owner meeting
                    </option>
                    <option value="lender-board-update">
                      Lender or board update
                    </option>
                    <option value="risk-committee-briefing">
                      Risk committee briefing
                    </option>
                  </>
                ) : (
                  <>
                    <option value="risk-summary">Risk summary PDF</option>
                    <option value="portfolio-review">Portfolio review</option>
                  </>
                )}
              </select>
            </Field>
            <fieldset>
              <legend className="text-xs font-semibold">Project scope</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => save({ ...configuration, projectIds: [] })}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${configuration.projectIds.length === 0 ? "border-deep-green bg-soft-green" : "border-border bg-background"}`}
                >
                  All accessible
                </button>
                {projects.map((project) => {
                  const selected = configuration.projectIds.includes(
                    project.id,
                  );
                  return (
                    <button
                      key={project.id}
                      type="button"
                      disabled={!editable}
                      aria-pressed={selected}
                      onClick={() =>
                        save({
                          ...configuration,
                          projectIds: selected
                            ? configuration.projectIds.filter(
                                (id) => id !== project.id,
                              )
                            : [...configuration.projectIds, project.id],
                        })
                      }
                      className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${selected ? "border-deep-green bg-soft-green" : "border-border bg-background"}`}
                    >
                      {project.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-border bg-background rounded-lg border p-3">
                <p className="text-deep-green text-xs font-semibold uppercase">
                  Included sections
                </p>
                <div className="mt-2 space-y-1">
                  {reportSections.map((section) => {
                    const selected = configuration.sections.includes(section);
                    return (
                      <label
                        key={section}
                        className="flex min-h-9 cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!editable}
                          onChange={() =>
                            save({
                              ...configuration,
                              sections: selected
                                ? configuration.sections.filter(
                                    (item) => item !== section,
                                  )
                                : [...configuration.sections, section],
                            })
                          }
                          className="accent-deep-green size-4"
                        />
                        {section}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="border-border bg-background rounded-lg border p-3">
                <p className="text-deep-green text-xs font-semibold uppercase">
                  Readiness checks
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {configuration.readinessWarnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : configuration.kind === "document" ? (
          <p className="text-sm">
            Search authorized documents for “{configuration.search}”.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <span className="text-muted text-xs">
          Review first. Permissions are checked again before anything is
          created.
        </span>
        {proposal.status === "created" && proposal.createdHref ? (
          <Link
            href={proposal.createdHref}
            className="bg-deep-green inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
          >
            Open created{" "}
            {configuration.kind === "meeting" ? "meeting" : "draft"}
            <ArrowUpRight className="size-3.5" />
          </Link>
        ) : isDirect ? (
          <button
            type="button"
            disabled={!canCreate || applying}
            onClick={() => applyWorkflowProposal(message.id)}
            className="bg-deep-green inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {applying ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {applying
              ? "Creating…"
              : `Approve & create ${configuration.kind === "meeting" ? "meeting" : "draft"}`}
          </button>
        ) : (
          <Link
            href={
              configuration.kind === "scenario"
                ? `/forecasts?scenarioName=${encodeURIComponent(configuration.name)}&scenarioProject=${configuration.projectId}&scenarioKind=${configuration.assumption}&scenarioCost=${configuration.costIncreasePercent}#scenario-heading`
                : configuration.kind === "deck" ||
                    configuration.kind === "report"
                  ? reportHandoffHref(configuration)
                  : proposal.href
            }
            className="bg-deep-green inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
          >
            {configuration.kind === "scenario"
              ? "Compare baseline & scenario"
              : "Review in workspace"}
            <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
}

function reportHandoffHref(
  configuration: Extract<
    NonNullable<AskWorkflowProposal["configuration"]>,
    { kind: "deck" | "report" }
  >,
) {
  const params = new URLSearchParams();
  if (configuration.kind === "deck")
    params.set("deckTemplate", configuration.template);
  for (const projectId of configuration.projectIds)
    params.append("project", projectId);
  for (const section of configuration.sections)
    params.append("section", section);
  return `/reports?${params.toString()}${configuration.kind === "deck" ? "#deck-review" : ""}`;
}

function GenericHandoff({ proposal }: { proposal: AskWorkflowProposal }) {
  return (
    <section
      aria-label="Workflow preview"
      className="border-accent-strong bg-soft-green mt-5 rounded-xl border p-4"
    >
      <ProposalHeader proposal={proposal} />
      <h3 className="mt-3 font-semibold">{proposal.title}</h3>
      <p className="mt-1 text-sm">{proposal.summary}</p>
      <Link
        href={proposal.href}
        className="bg-deep-green mt-4 inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
      >
        {proposal.actionLabel}
        <ArrowUpRight className="size-3.5" />
      </Link>
    </section>
  );
}

function ProposalHeader({
  proposal,
  applying = false,
}: {
  proposal: AskWorkflowProposal;
  applying?: boolean;
}) {
  const steps = ["Suggested", "Review", "Approved", "Created"];
  const activeStep =
    applying || proposal.status === "approved"
      ? 2
      : proposal.status === "created"
        ? 3
        : proposal.status === "ready_for_review"
          ? 1
          : 0;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-deep-green text-xs font-semibold tracking-wide uppercase">
          Preview · Nothing changes without approval
        </p>
        <span className="bg-surface rounded-full px-2.5 py-1 text-xs font-semibold">
          {applying
            ? "Applying approved changes"
            : statusLabels[proposal.status]}
        </span>
      </div>
      <ol
        aria-label="Proposal progress"
        className="mt-3 flex items-center gap-1"
      >
        {steps.map((step, index) => (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-1">
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold ${index <= activeStep ? "bg-deep-green text-white" : "bg-surface text-muted"}`}
            >
              {index < activeStep ? <Check className="size-3" /> : index + 1}
            </span>
            <span className="text-muted hidden truncate text-[0.65rem] sm:inline">
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span className="bg-border h-px min-w-2 flex-1" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ItemStatus({ item }: { item: AskWorkflowActionItem }) {
  const Icon =
    item.status === "created"
      ? CheckCircle2
      : item.status === "failed"
        ? CircleDashed
        : PencilLine;
  return (
    <span className="text-muted inline-flex items-center gap-1 text-xs font-semibold capitalize">
      <Icon className="size-3.5" aria-hidden="true" />
      {item.status.replaceAll("_", " ")}
    </span>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid gap-1.5 text-xs font-semibold ${className}`}>
      {label}
      {children}
    </label>
  );
}

function isActionItemValid(item: AskWorkflowActionItem) {
  return Boolean(
    item.title.trim() && item.description.trim() && item.riskId.trim(),
  );
}
