import Link from "next/link";
import { notFound } from "next/navigation";

import { generateEmailDraftAction } from "@/app/risks/[riskId]/email-draft/actions";
import { Card } from "@/components/ui/card";
import { DraftEditor } from "@/features/email-drafts/draft-editor";
import { EmailDraftService } from "@/features/email-drafts/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function EmailDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ riskId: string }>;
  searchParams: Promise<{ draftId?: string; actionId?: string }>;
}) {
  const [{ riskId }, query, context] = await Promise.all([
    params,
    searchParams,
    requireActorContext(),
  ]);
  const service = new EmailDraftService(createAdminSupabaseClient());
  if (query.draftId) {
    const workspace = await service
      .workspace(context, query.draftId)
      .catch(() => null);
    if (!workspace || workspace.draft.risk_id !== riskId) notFound();
    return (
      <PageFrame riskId={riskId} title="Review email draft">
        <Card>
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="bg-soft-green text-deep-green rounded-full px-2.5 py-1 capitalize">
              {workspace.draft.status.replaceAll("_", " ")}
            </span>
            <span className="bg-background rounded-full border px-2.5 py-1 capitalize">
              {workspace.draft.generation_source.replaceAll("_", " ")}
            </span>
            <span className="text-muted">
              For {workspace.draft.intended_recipient_role} ·{" "}
              {workspace.draft.suggested_urgency} urgency ·{" "}
              {workspace.draft.desired_tone} tone
            </span>
          </div>
          <DraftEditor draft={workspace.draft} contacts={workspace.contacts} />
          <p className="text-muted mt-6 border-t pt-4 text-xs">
            Generated with {workspace.draft.model_name} · prompt{" "}
            {workspace.draft.prompt_version} ·{" "}
            {workspace.draft.evidence_ids.length} evidence reference(s).
            Sightline does not send this email.
          </p>
        </Card>
      </PageFrame>
    );
  }
  const source = await service
    .composeContext(context, riskId, query.actionId ?? null)
    .catch(() => null);
  if (!source) notFound();
  return (
    <PageFrame riskId={riskId} title="Draft an email">
      <Card>
        <p className="text-muted mb-5 text-sm leading-6">
          Sightline will draft from the risk and cited evidence. You remain
          responsible for editing, choosing a recipient, and sending it outside
          Sightline.
        </p>
        {source.evidence.length ? (
          <form action={generateEmailDraftAction} className="space-y-5">
            <input type="hidden" name="riskId" value={riskId} />
            <input type="hidden" name="actionId" value={query.actionId ?? ""} />
            <label className="block text-sm font-semibold">
              Recipient role
              <input
                name="recipientRole"
                defaultValue={
                  source.vendor ? "Vendor contact" : "Project manager"
                }
                required
                minLength={2}
                maxLength={120}
                className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Desired tone
              <select
                name="desiredTone"
                defaultValue="concise"
                className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
              >
                <option value="concise">Concise</option>
                <option value="collaborative">Collaborative</option>
                <option value="firm">Firm</option>
                <option value="formal">Formal</option>
              </select>
            </label>
            <button className="bg-deep-green min-h-11 rounded-md px-4 text-sm font-semibold text-white">
              Generate editable draft
            </button>
          </form>
        ) : (
          <div
            role="alert"
            className="border-border bg-background rounded-lg border p-4"
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
    </PageFrame>
  );
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
    <div className="mx-auto max-w-4xl px-[var(--page-gutter)] py-10">
      <Link
        href={`/risks/${riskId}`}
        className="text-muted text-sm font-semibold"
      >
        ← Back to risk
      </Link>
      <header className="mt-5 mb-6">
        <p className="text-muted text-xs font-semibold tracking-wide uppercase">
          AI-assisted · Human controlled
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
      </header>
      {children}
    </div>
  );
}
