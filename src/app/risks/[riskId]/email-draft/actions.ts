"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  generateEmailDraftSchema,
  saveEmailDraftSchema,
} from "@/domain/ai/email-draft";
import { EmailDraftService } from "@/features/email-drafts/service";
import { runServerMutation } from "@/lib/server-mutation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function generateEmailDraftAction(input: unknown) {
  const raw =
    input instanceof FormData
      ? {
          riskId: input.get("riskId"),
          actionId: input.get("actionId") || null,
          recipientRole: input.get("recipientRole"),
          desiredTone: input.get("desiredTone"),
        }
      : input;
  const parsed = generateEmailDraftSchema.parse(raw);
  const draft = await runServerMutation(
    generateEmailDraftSchema,
    parsed,
    (context, value) =>
      new EmailDraftService(createAdminSupabaseClient()).generate(
        context,
        value,
      ),
  );
  redirect(`/risks/${draft.risk_id}/email-draft?draftId=${draft.id}`);
}

export async function saveEmailDraftAction(input: unknown) {
  const parsed = saveEmailDraftSchema.parse(input);
  const draft = await runServerMutation(
    saveEmailDraftSchema,
    parsed,
    (context, value) =>
      new EmailDraftService(createAdminSupabaseClient()).save(
        context,
        value.draftId,
        value,
      ),
  );
  revalidatePath(`/risks/${draft.risk_id}/email-draft`);
  return { status: draft.status };
}

export async function markEmailDraftSentAction(draftId: string) {
  const value = saveEmailDraftSchema.shape.draftId.parse(draftId);
  const draft = await runServerMutation(
    saveEmailDraftSchema.shape.draftId,
    value,
    (context, id) =>
      new EmailDraftService(createAdminSupabaseClient()).markSent(context, id),
  );
  revalidatePath(`/risks/${draft.risk_id}/email-draft`);
  revalidatePath(`/risks/${draft.risk_id}`);
  revalidatePath("/activity");
  return { status: draft.status };
}
