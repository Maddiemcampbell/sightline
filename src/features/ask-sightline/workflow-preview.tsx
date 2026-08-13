"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
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

export function WorkflowPreview({ message }: { message: SharedAskMessage }) {
  const proposal = message.workflowProposal;
  const { updateWorkflowProposal, applyWorkflowProposal, applyingProposalId } =
    useSharedAsk();
  const { searchResources } = useWorkspaceResources();
  if (!proposal) return null;
  const applying = applyingProposalId === proposal.id;

  if (proposal.command !== "/action")
    return (
      <section
        aria-label="Workflow preview"
        className="border-accent-strong bg-soft-green mt-5 rounded-xl border p-4"
      >
        <ProposalHeader proposal={proposal} />
        <h3 className="mt-3 font-semibold">{proposal.title}</h3>
        <p className="mt-1 text-sm leading-6">{proposal.summary}</p>
        <p className="text-muted mt-3 text-xs leading-5">{proposal.effect}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={proposal.href}
            className="bg-deep-green inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
          >
            {proposal.actionLabel}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <span className="text-muted text-xs">
            Required details are confirmed in the full workspace.
          </span>
        </div>
      </section>
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
                saveItems(
                  proposal.items.map((item) => ({ ...item, selected: false })),
                )
              }
              className="border-border bg-surface inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
            >
              <X className="size-3.5" aria-hidden="true" /> Cancel
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
