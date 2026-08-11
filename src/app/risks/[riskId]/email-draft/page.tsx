import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { generateEmailDraftAction } from "@/app/risks/[riskId]/email-draft/actions";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deadlineState } from "@/domain/ai/email-draft";
import { DraftEditor } from "@/features/email-drafts/draft-editor";
import { EmailDraftService } from "@/features/email-drafts/service";
import { FollowUpPanel } from "@/features/commitment-follow-ups/follow-up-panel";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Contact = Readonly<{
  key: string;
  name: string;
  email: string;
  role: string;
}>;

export default async function EmailDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ riskId: string }>;
  searchParams: Promise<{
    draftId?: string;
    actionId?: string;
    purpose?: string;
  }>;
}) {
  const [{ riskId }, query, context] = await Promise.all([
    params,
    searchParams,
    requireActorContext(),
  ]);
  const service = new EmailDraftService(await createServerSupabaseClient());
  if (query.draftId) {
    const workspace = await service
      .workspace(context, query.draftId)
      .catch(() => null);
    if (!workspace || workspace.draft.risk_id !== riskId) notFound();
    const dueAt = workspace.action?.due_at ?? workspace.risk.due_at;
    const deadline = deadlineState(dueAt, new Date().toISOString());
    return (
      <PageFrame riskId={riskId} title="Review email draft">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <Card className="overflow-hidden p-0">
            <div className="border-border bg-background flex flex-wrap items-center gap-2 border-b px-5 py-4 sm:px-6">
              <StatusBadge status="active">
                {workspace.draft.status === "draft"
                  ? "Editable draft"
                  : "Sent manually"}
              </StatusBadge>
              <StatusBadge status="neutral">
                {workspace.draft.generation_source === "ai"
                  ? "AI generated"
                  : "Template generated"}
              </StatusBadge>
              <span className="text-muted ml-auto text-xs">
                {workspace.draft.suggested_urgency} urgency ·{" "}
                {workspace.draft.desired_tone} tone
              </span>
            </div>
            <div className="p-5 sm:p-6">
              <DraftEditor
                draft={workspace.draft}
                contacts={workspace.contacts}
                requestedCommitment={
                  workspace.action?.title ?? "Confirm the requested next step"
                }
                expectedResponseDate={futureResponseDate(dueAt)}
              />
            </div>
          </Card>

          <aside className="space-y-5">
            {workspace.followUp ? (
              <Card>
                <FollowUpPanel
                  followUp={workspace.followUp}
                  evidence={workspace.evidence}
                  sentAt={workspace.draft.manually_sent_at!}
                />
              </Card>
            ) : null}
            {deadline.state === "overdue" ? (
              <div
                role="alert"
                className="bg-soft-amber text-warning rounded-lg p-4"
              >
                <div className="flex gap-3">
                  <AlertTriangle
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      Response date has passed
                    </p>
                    <p className="mt-1 text-xs leading-5">
                      The draft uses overdue language instead of asking for a
                      response by {deadline.label}.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <Card>
              <div className="flex items-center gap-2">
                <FileText
                  className="text-deep-green size-4"
                  aria-hidden="true"
                />
                <h2 className="font-semibold">Draft context</h2>
              </div>
              <dl className="mt-4 space-y-4 text-sm">
                <ContextDatum label="Risk" value={workspace.risk.title} />
                <ContextDatum
                  label="Project"
                  value={workspace.project?.name ?? "No project"}
                />
                <ContextDatum
                  label="Requested action"
                  value={
                    workspace.action?.title ??
                    "Review risk and confirm next step"
                  }
                />
                <ContextDatum
                  label="Response date"
                  value={deadline.label ?? "No date specified"}
                />
              </dl>
              <div className="border-border mt-5 border-t pt-4">
                <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                  Grounded in
                </p>
                <ul className="mt-3 space-y-3">
                  {workspace.evidence.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex gap-2 text-xs leading-5">
                      <CheckCircle2
                        className="text-deep-green mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        <strong className="block">{item.title}</strong>
                        <span className="text-muted">{item.excerpt}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
            {workspace.draft.status === "draft" ? (
              <Card>
                <div className="flex items-center gap-2">
                  <RefreshCw
                    className="text-deep-green size-4"
                    aria-hidden="true"
                  />
                  <h2 className="font-semibold">Create another version</h2>
                </div>
                <p className="text-muted mt-2 text-xs leading-5">
                  Change the communication goal without overwriting this draft.
                </p>
                <GenerationForm
                  riskId={riskId}
                  actionId={workspace.action?.id ?? null}
                  contacts={workspace.contacts}
                  defaultContactKey={contactKeyForDraft(workspace.draft)}
                  compact
                />
              </Card>
            ) : null}
            <p className="text-muted px-1 text-xs leading-5">
              Generated with {workspace.draft.model_name} from{" "}
              {workspace.draft.evidence_ids.length} evidence reference(s).
              Sightline never sends without you.
            </p>
          </aside>
        </div>
      </PageFrame>
    );
  }

  const source = await service
    .composeContext(context, riskId, query.actionId ?? null)
    .catch(() => null);
  if (!source) notFound();
  const contacts = contactsFromSource(source);
  const preferredContact = source.vendor?.contact_email
    ? `vendor:${source.vendor.id}`
    : "";
  const dueAt = source.action?.due_at ?? source.risk.due_at;
  const deadline = deadlineState(dueAt, new Date().toISOString());
  return (
    <PageFrame riskId={riskId} title="Draft an email">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <div className="flex items-start gap-3">
            <span className="bg-soft-green text-deep-green grid size-10 shrink-0 place-items-center rounded-md">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">Set the communication goal</h2>
              <p className="text-muted mt-1 text-sm leading-6">
                Sightline will create an editable, evidence-grounded draft. You
                choose the recipient and remain responsible for sending it.
              </p>
            </div>
          </div>
          {source.evidence.length ? (
            <GenerationForm
              riskId={riskId}
              actionId={query.actionId ?? null}
              contacts={contacts}
              defaultContactKey={preferredContact}
              defaultPurpose={
                query.purpose === "escalation" ? "escalation" : "reminder"
              }
            />
          ) : (
            <div
              role="alert"
              className="border-border bg-background mt-6 rounded-lg border p-4"
            >
              <p className="font-semibold">
                Evidence is required before drafting.
              </p>
              <p className="text-muted mt-1 text-sm">
                Attach a supported source to this risk so Sightline cannot draft
                an unsupported request.
              </p>
              <Link
                href={`/risks/${riskId}?tab=evidence`}
                className="text-deep-green mt-3 inline-block text-sm font-semibold"
              >
                Review evidence →
              </Link>
            </div>
          )}
        </Card>
        <aside className="space-y-5">
          {deadline.state === "overdue" ? (
            <div
              role="alert"
              className="bg-soft-amber text-warning rounded-lg p-4"
            >
              <p className="text-sm font-semibold">Overdue response date</p>
              <p className="mt-1 text-xs leading-5">
                The requested response date was {deadline.label}. The draft will
                ask for a current status instead of repeating a stale deadline.
              </p>
            </div>
          ) : null}
          <Card>
            <h2 className="font-semibold">Source preview</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <ContextDatum label="Risk" value={source.risk.title} />
              <ContextDatum
                label="Project"
                value={source.project?.name ?? "No project"}
              />
              <ContextDatum
                label="Action"
                value={
                  source.action?.title ?? "Review risk and confirm next step"
                }
              />
              <ContextDatum
                label="Evidence"
                value={`${source.evidence.length} supported source${source.evidence.length === 1 ? "" : "s"}`}
              />
            </dl>
          </Card>
        </aside>
      </div>
    </PageFrame>
  );
}

function GenerationForm({
  riskId,
  actionId,
  contacts,
  defaultContactKey,
  compact = false,
  defaultPurpose = "reminder",
}: {
  riskId: string;
  actionId: string | null;
  contacts: readonly Contact[];
  defaultContactKey: string;
  compact?: boolean;
  defaultPurpose?: "reminder" | "escalation";
}) {
  const defaultContact = contacts.find(
    (contact) => contact.key === defaultContactKey,
  );
  return (
    <form
      action={generateEmailDraftAction}
      className={compact ? "mt-5 space-y-4" : "mt-7 space-y-6"}
    >
      <input type="hidden" name="riskId" value={riskId} />
      <input type="hidden" name="actionId" value={actionId ?? ""} />
      <input
        type="hidden"
        name="recipientRole"
        value={defaultContact?.role ?? "Project contact"}
      />
      <label className="block text-sm font-semibold">
        Recipient
        <select
          name="contactKey"
          defaultValue={defaultContactKey}
          className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
        >
          <option value="">Choose later</option>
          {contacts.map((contact) => (
            <option key={contact.key} value={contact.key}>
              {contact.name} — {contact.role}
            </option>
          ))}
        </select>
      </label>
      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <SelectControl
          label="Purpose"
          name="purpose"
          defaultValue={defaultPurpose}
          options={[
            ["initial_request", "Initial request"],
            ["reminder", "Reminder"],
            ["status_update", "Status update"],
            ["escalation", "Escalation"],
          ]}
        />
        <SelectControl
          label="Tone"
          name="desiredTone"
          defaultValue="collaborative"
          options={[
            ["concise", "Direct"],
            ["collaborative", "Collaborative"],
            ["firm", "Firm"],
            ["formal", "Formal"],
          ]}
        />
        <SelectControl
          label="Urgency"
          name="requestedUrgency"
          defaultValue="soon"
          options={[
            ["routine", "Routine"],
            ["soon", "Soon"],
            ["urgent", "Urgent"],
          ]}
        />
        <SelectControl
          label="Length"
          name="length"
          defaultValue="standard"
          options={[
            ["concise", "Concise"],
            ["standard", "Standard"],
            ["detailed", "Detailed"],
          ]}
        />
      </div>
      <button className="bg-deep-green hover:bg-ink inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition-colors">
        <Sparkles className="size-4" aria-hidden="true" />
        {compact ? "Generate new version" : "Generate editable draft"}
      </button>
    </form>
  );
}

function SelectControl({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function ContextDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1 leading-5">{value}</dd>
    </div>
  );
}

function contactsFromSource(
  source: Awaited<ReturnType<EmailDraftService["composeContext"]>>,
): Contact[] {
  return [
    ...source.users.map((user) => ({
      key: `user:${user.id}`,
      name: user.full_name,
      email: user.email,
      role: user.title ?? user.role,
    })),
    ...(source.vendor?.contact_email
      ? [
          {
            key: `vendor:${source.vendor.id}`,
            name: source.vendor.contact_name ?? source.vendor.name,
            email: source.vendor.contact_email,
            role: `${source.vendor.name} contact`,
          },
        ]
      : []),
  ];
}

function contactKeyForDraft(draft: {
  recipient_user_id: string | null;
  recipient_vendor_id: string | null;
}) {
  return draft.recipient_user_id
    ? `user:${draft.recipient_user_id}`
    : draft.recipient_vendor_id
      ? `vendor:${draft.recipient_vendor_id}`
      : "";
}

function futureResponseDate(value: string | null) {
  const candidate = value ? new Date(value) : new Date();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (candidate.getTime() <= today.getTime()) {
    candidate.setTime(today.getTime());
    candidate.setUTCDate(candidate.getUTCDate() + 3);
  }
  return candidate.toISOString().slice(0, 10);
}

function PageFrame({
  riskId,
  title,
  children,
}: {
  riskId: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <Link
        href={`/risks/${riskId}`}
        className="text-muted text-sm font-semibold"
      >
        ← Back to risk
      </Link>
      <header className="mt-5 mb-7">
        <p className="text-deep-green text-xs font-semibold tracking-[0.12em] uppercase">
          Human-controlled communication
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
          {title}
        </h1>
      </header>
      {children}
    </div>
  );
}
