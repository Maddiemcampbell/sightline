import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EMAIL_DRAFT_PROMPT_VERSION,
  emailDraftInputSchema,
  type EmailDraftInput,
} from "@/domain/ai/email-draft";
import { RiskActivityService } from "@/features/activity/service";
import { OpenAiEmailDraftProvider } from "@/features/ai/openai-email-draft-provider";
import { tryRecordAiObservability } from "@/features/ai/observability";
import type { EmailDraftProvider } from "@/features/ai/provider";
import { sanitizeUntrustedExcerpt } from "@/features/ai/prompt-security";
import { EmailDraftRepository } from "@/features/email-drafts/repository";
import { CommitmentFollowUpService } from "@/features/commitment-follow-ups/service";
import { generateEmailDraftWithFallback } from "@/features/email-drafts/generation";
import type { ActorContext } from "@/lib/auth/authorization";
import { getServerEnv } from "@/lib/env";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class EmailDraftService {
  private readonly repository: EmailDraftRepository;
  private readonly activity: RiskActivityService;
  constructor(
    private readonly client: SupabaseClient<AppDatabase>,
    private readonly provider?: EmailDraftProvider,
  ) {
    this.repository = new EmailDraftRepository(client);
    this.activity = new RiskActivityService(client);
  }

  async composeContext(
    context: ActorContext,
    riskId: string,
    actionId: string | null,
  ) {
    return this.repository.contextForRisk(context, riskId, actionId);
  }

  async generate(
    context: ActorContext,
    request: {
      riskId: string;
      actionId: string | null;
      recipientRole: string;
      contactKey: string | null;
      desiredTone: EmailDraftInput["desiredTone"];
      requestedUrgency: EmailDraftInput["requestedUrgency"];
      purpose: EmailDraftInput["purpose"];
      length: EmailDraftInput["length"];
    },
  ) {
    const source = await this.repository.contextForRisk(
      context,
      request.riskId,
      request.actionId,
    );
    if (!source.evidence.length)
      throw new Error(
        "At least one evidence record is required to draft an email.",
      );
    const contacts = buildContacts(source);
    const contact = request.contactKey
      ? contacts.find((item) => item.key === request.contactKey)
      : null;
    if (request.contactKey && !contact) throw new Error("Contact not found.");
    const sender = source.users.find((user) => user.id === context.userId);
    const input = emailDraftInputSchema.parse({
      organizationId: context.organizationId,
      riskId: source.risk.id,
      riskTitle: source.risk.title,
      riskSummary: source.risk.summary,
      project: source.project,
      vendor: source.vendor
        ? { id: source.vendor.id, name: source.vendor.name }
        : null,
      evidence: source.evidence.map((item) => ({
        ...item,
        excerpt: sanitizeUntrustedExcerpt(item.excerpt),
        whyItMatters: sanitizeUntrustedExcerpt(item.why_it_matters),
      })),
      requestedAction:
        source.action?.title ??
        "review this risk and confirm the next mitigation step",
      dueDate: normalizeDatabaseTimestamp(
        source.action?.due_at ?? source.risk.due_at,
      ),
      generatedAt: new Date().toISOString(),
      recipientRole: contact?.role ?? request.recipientRole,
      recipientName: contact?.name ?? null,
      senderName: sender?.full_name ?? "Sightline user",
      desiredTone: request.desiredTone,
      requestedUrgency: request.requestedUrgency,
      purpose: request.purpose,
      length: request.length,
    });
    const provider = this.provider ?? configuredProvider();
    const result = await generateEmailDraftWithFallback(provider, input);
    const generationSource = result.generationSource;
    const draft = await this.repository.insert(context, {
      organization_id: context.organizationId,
      risk_id: source.risk.id,
      recommended_action_id: source.action?.id ?? null,
      created_by_user_id: context.userId,
      intended_recipient_role: result.output.intendedRecipientRole,
      desired_tone: input.desiredTone,
      suggested_urgency: result.output.suggestedUrgency,
      subject: result.output.subject,
      body: result.output.body,
      evidence_ids: result.output.evidenceIdsUsed,
      generation_source: generationSource,
      provider: generationSource === "ai" ? provider.name : "deterministic",
      model_name: result.model,
      prompt_version: EMAIL_DRAFT_PROMPT_VERSION,
      latency_ms: result.latencyMs,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      total_tokens: result.usage.totalTokens,
      recipient_user_id: contact?.userId ?? null,
      recipient_vendor_id: contact?.vendorId ?? null,
      recipient_name: contact?.name ?? null,
      recipient_email: contact?.email ?? null,
    });
    await tryRecordAiObservability(this.client, {
      organizationId: context.organizationId,
      operationType: "email_draft",
      sourceRecordId: draft.id,
      provider: generationSource === "ai" ? provider.name : "deterministic",
      modelName: result.model,
      promptVersion: EMAIL_DRAFT_PROMPT_VERSION,
      status: generationSource === "ai" ? "success" : "fallback",
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      retrievalCandidateCount: source.evidence.length,
      retrievalSelectedCount: input.evidence.length,
      evidenceAvailableCount: input.evidence.length,
      evidenceCitedCount: new Set(result.output.evidenceIdsUsed).size,
      errorCode:
        generationSource === "deterministic_fallback"
          ? "provider_failure"
          : undefined,
    });
    await this.activity.append(context, {
      riskId: source.risk.id,
      activityType: "email_drafted",
      actorType: generationSource === "ai" ? "ai" : "system",
      summary: "Email draft created for human review.",
      metadata: {
        draftId: draft.id,
        generationSource,
        evidenceIds: draft.evidence_ids,
      },
    });
    return draft;
  }

  async workspace(context: ActorContext, draftId: string) {
    const draft = await this.repository.get(context, draftId);
    const source = await this.repository.contextForRisk(
      context,
      draft.risk_id,
      draft.recommended_action_id,
    );
    const followUp = await new CommitmentFollowUpService(this.client).forDraft(
      context,
      draftId,
    );
    return { ...source, draft, followUp, contacts: buildContacts(source) };
  }

  async save(
    context: ActorContext,
    draftId: string,
    values: { subject: string; body: string; contactKey: string | null },
  ) {
    const workspace = await this.workspace(context, draftId);
    if (workspace.draft.status === "manually_sent")
      throw new Error("A manually sent draft cannot be edited.");
    const contact = values.contactKey
      ? workspace.contacts.find((item) => item.key === values.contactKey)
      : null;
    if (values.contactKey && !contact) throw new Error("Contact not found.");
    return this.repository.update(context, draftId, {
      subject: values.subject,
      body: values.body,
      recipient_user_id: contact?.userId ?? null,
      recipient_vendor_id: contact?.vendorId ?? null,
      recipient_name: contact?.name ?? null,
      recipient_email: contact?.email ?? null,
    });
  }

  async markSent(
    context: ActorContext,
    draftId: string,
    tracking?: { requestedCommitment: string; expectedResponseAt: string },
  ) {
    const draft = await this.repository.get(context, draftId);
    let updated = draft;
    if (draft.status !== "manually_sent") {
      const sentAt = new Date().toISOString();
      updated = await this.repository.update(context, draftId, {
        status: "manually_sent",
        manually_sent_at: sentAt,
        manually_sent_by_user_id: context.userId,
      });
      await this.activity.append(context, {
        riskId: draft.risk_id,
        activityType: "email_marked_sent",
        summary: "Email draft marked as sent manually.",
        metadata: { draftId },
      });
    }
    if (tracking) {
      await new CommitmentFollowUpService(this.client).track(
        context,
        draftId,
        tracking.requestedCommitment,
        tracking.expectedResponseAt,
      );
    }
    return updated;
  }
}

function buildContacts(
  source: Awaited<ReturnType<EmailDraftRepository["contextForRisk"]>>,
) {
  return [
    ...source.users.map((user) => ({
      key: `user:${user.id}`,
      name: user.full_name,
      email: user.email,
      role: user.title ?? user.role,
      userId: user.id,
      vendorId: null,
    })),
    ...(source.vendor?.contact_email
      ? [
          {
            key: `vendor:${source.vendor.id}`,
            name: source.vendor.contact_name ?? source.vendor.name,
            email: source.vendor.contact_email,
            role: `${source.vendor.name} contact`,
            userId: null,
            vendorId: source.vendor.id,
          },
        ]
      : []),
  ];
}

function normalizeDatabaseTimestamp(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

function configuredProvider(): EmailDraftProvider {
  const env = getServerEnv();
  // Browser tests exercise the complete fallback workflow without external calls.
  if (!env.OPENAI_API_KEY || process.env.SIGHTLINE_E2E === "true")
    return {
      name: "openai",
      model: env.OPENAI_MODEL ?? "gpt-5.6-terra",
      draft: async () => {
        throw new Error("OPENAI_API_KEY is not configured.");
      },
    };
  return new OpenAiEmailDraftProvider(
    env.OPENAI_API_KEY,
    env.OPENAI_MODEL ?? "gpt-5.6-terra",
  );
}
