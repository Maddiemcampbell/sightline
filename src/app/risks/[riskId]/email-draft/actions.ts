"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  generateEmailDraftSchema,
  saveEmailDraftSchema,
} from "@/domain/ai/email-draft";
import {
  recordCommitmentResponseSchema,
  trackCommitmentSchema,
  verifyCommitmentResponseSchema,
} from "@/features/commitment-follow-ups/validation";
import { CommitmentFollowUpService } from "@/features/commitment-follow-ups/service";
import { EmailDraftService } from "@/features/email-drafts/service";
import { runServerMutation } from "@/lib/server-mutation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAuthorized,
  canEditRisk,
  canResolveProjectRisks,
} from "@/lib/auth/authorization";
import {
  requireEmailDraftProjectAccess,
  requireCommitmentFollowUpProjectAccess,
  requireRiskProjectAccess,
} from "@/lib/auth/project-access";

export async function generateEmailDraftAction(input: unknown) {
  const raw =
    input instanceof FormData
      ? {
          riskId: input.get("riskId"),
          actionId: input.get("actionId") || null,
          recipientRole: input.get("recipientRole"),
          contactKey: input.get("contactKey") || null,
          desiredTone: input.get("desiredTone"),
          requestedUrgency: input.get("requestedUrgency"),
          purpose: input.get("purpose"),
          length: input.get("length"),
        }
      : input;
  const parsed = generateEmailDraftSchema.parse(raw);
  const draft = await runServerMutation(
    generateEmailDraftSchema,
    parsed,
    async (context, value) => {
      const access = await requireRiskProjectAccess(context, value.riskId);
      assertAuthorized(
        canEditRisk(context) &&
          canResolveProjectRisks(context, access.resource),
      );
      return new EmailDraftService(await createServerSupabaseClient()).generate(
        context,
        value,
      );
    },
  );
  redirect(`/risks/${draft.risk_id}/email-draft?draftId=${draft.id}`);
}

export async function saveEmailDraftAction(input: unknown) {
  const parsed = saveEmailDraftSchema.parse(input);
  const draft = await runServerMutation(
    saveEmailDraftSchema,
    parsed,
    async (context, value) => {
      const access = await requireEmailDraftProjectAccess(
        context,
        value.draftId,
      );
      assertAuthorized(
        canEditRisk(context) &&
          canResolveProjectRisks(context, access.resource),
      );
      return new EmailDraftService(await createServerSupabaseClient()).save(
        context,
        value.draftId,
        value,
      );
    },
  );
  revalidatePath(`/risks/${draft.risk_id}/email-draft`);
  return { status: draft.status };
}

export async function markEmailDraftSentAction(
  draftId: string,
  tracking?: unknown,
) {
  const value = saveEmailDraftSchema.shape.draftId.parse(draftId);
  const trackingValue = tracking
    ? trackCommitmentSchema.omit({ draftId: true }).parse(tracking)
    : undefined;
  const draft = await runServerMutation(
    saveEmailDraftSchema.shape.draftId,
    value,
    async (context, id) => {
      const access = await requireEmailDraftProjectAccess(context, id);
      assertAuthorized(
        canEditRisk(context) &&
          canResolveProjectRisks(context, access.resource),
      );
      return new EmailDraftService(await createServerSupabaseClient()).markSent(
        context,
        id,
        trackingValue,
      );
    },
  );
  revalidatePath(`/risks/${draft.risk_id}/email-draft`);
  revalidatePath(`/risks/${draft.risk_id}`);
  revalidatePath("/activity");
  return { status: draft.status };
}

export async function recordCommitmentResponseAction(input: unknown) {
  const parsed = recordCommitmentResponseSchema.parse(input);
  const result = await runServerMutation(
    recordCommitmentResponseSchema,
    parsed,
    async (context, value) => {
      const access = await requireCommitmentFollowUpProjectAccess(
        context,
        value.followUpId,
      );
      assertAuthorized(
        canEditRisk(context) &&
          canResolveProjectRisks(context, access.resource),
      );
      return new CommitmentFollowUpService(
        await createServerSupabaseClient(),
      ).recordResponse(context, value.followUpId, value.evidenceId, value.note);
    },
  );
  revalidatePath(`/risks/${result.risk_id}/email-draft`);
  revalidatePath("/actions");
  return { status: result.status };
}

export async function verifyCommitmentResponseAction(input: unknown) {
  const parsed = verifyCommitmentResponseSchema.parse(input);
  const result = await runServerMutation(
    verifyCommitmentResponseSchema,
    parsed,
    async (context, value) => {
      const access = await requireCommitmentFollowUpProjectAccess(
        context,
        value.followUpId,
      );
      assertAuthorized(
        canEditRisk(context) &&
          canResolveProjectRisks(context, access.resource),
      );
      const service = new CommitmentFollowUpService(
        await createServerSupabaseClient(),
      );
      return service.verify(context, value.followUpId);
    },
  );
  revalidatePath(`/risks/${result.risk_id}/email-draft`);
  revalidatePath("/actions");
  return { status: result.status };
}
