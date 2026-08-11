import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { RiskActivityService } from "@/features/activity/service";
import { CommitmentFollowUpRepository } from "@/features/commitment-follow-ups/repository";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class CommitmentFollowUpService {
  private readonly repository: CommitmentFollowUpRepository;
  private readonly activity: RiskActivityService;

  constructor(private readonly client: SupabaseClient<AppDatabase>) {
    this.repository = new CommitmentFollowUpRepository(client);
    this.activity = new RiskActivityService(client);
  }

  forDraft(context: ActorContext, draftId: string) {
    return this.repository.forDraft(context, draftId);
  }

  async track(
    context: ActorContext,
    draftId: string,
    requestedCommitment: string,
    expectedResponseAt: string,
  ) {
    const existing = await this.repository.forDraft(context, draftId);
    if (existing) return existing;
    const { data: draft, error } = await this.client
      .from("risk_email_drafts")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", draftId)
      .single();
    if (error) throw new Error(error.message);
    if (draft.status !== "manually_sent")
      throw new Error("Mark the email as sent before tracking its commitment.");
    const followUp = await this.repository.create(context, {
      organization_id: context.organizationId,
      risk_id: draft.risk_id,
      email_draft_id: draft.id,
      recommended_action_id: draft.recommended_action_id,
      owner_user_id: context.userId,
      requested_commitment: requestedCommitment,
      expected_response_at: expectedResponseAt,
      status: "awaiting_response",
    });
    await this.activity.append(context, {
      riskId: draft.risk_id,
      activityType: "commitment_tracked",
      summary: `Commitment tracked through ${formatDate(expectedResponseAt)}.`,
      metadata: { followUpId: followUp.id, emailDraftId: draft.id },
    });
    return followUp;
  }

  async recordResponse(
    context: ActorContext,
    followUpId: string,
    evidenceId: string,
    note: string,
  ) {
    const followUp = await this.repository.get(context, followUpId);
    if (followUp.status === "resolved")
      throw new Error("This follow-up is already resolved.");
    const { data: evidence, error } = await this.client
      .from("risk_evidence")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("risk_id", followUp.risk_id)
      .eq("id", evidenceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!evidence) throw new Error("Choose evidence attached to this risk.");
    const receivedAt = new Date().toISOString();
    const updated = await this.repository.update(context, followUpId, {
      status: "response_received",
      response_evidence_id: evidenceId,
      response_note: note || null,
      response_received_at: receivedAt,
      verified_at: null,
      verified_by_user_id: null,
    });
    await this.activity.append(context, {
      riskId: followUp.risk_id,
      activityType: "commitment_response_received",
      summary: "Response evidence received; verification is still required.",
      metadata: { followUpId, evidenceId },
    });
    return updated;
  }

  async verify(context: ActorContext, followUpId: string) {
    const followUp = await this.repository.get(context, followUpId);
    if (
      followUp.status !== "response_received" ||
      !followUp.response_evidence_id
    )
      throw new Error(
        "Record supporting evidence before resolving this follow-up.",
      );
    const verifiedAt = new Date().toISOString();
    const updated = await this.repository.update(context, followUpId, {
      status: "resolved",
      verified_at: verifiedAt,
      verified_by_user_id: context.userId,
    });
    if (followUp.recommended_action_id) {
      const { data: action, error } = await this.client
        .from("recommended_actions")
        .select("status")
        .eq("organization_id", context.organizationId)
        .eq("id", followUp.recommended_action_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (action && ["accepted", "in_progress"].includes(action.status)) {
        const result = await this.client
          .from("recommended_actions")
          .update({
            status: "completed",
            completed_at: verifiedAt,
            updated_by_user_id: context.userId,
          })
          .eq("organization_id", context.organizationId)
          .eq("id", followUp.recommended_action_id);
        if (result.error) throw new Error(result.error.message);
      }
    }
    await this.activity.append(context, {
      riskId: followUp.risk_id,
      activityType: "commitment_resolved",
      summary: "Commitment verified against evidence and follow-up resolved.",
      metadata: { followUpId, evidenceId: followUp.response_evidence_id },
    });
    return updated;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
