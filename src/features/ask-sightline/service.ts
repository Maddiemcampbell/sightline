import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  RISK_QUESTION_PROMPT_VERSION,
  riskQuestionContextSchema,
  riskQuestionOutputSchema,
  validateRiskQuestionGrounding,
} from "@/domain/ai/risk-question";
import { OpenAiRiskQuestionProvider } from "@/features/ask-sightline/openai-provider";
import { allowRiskQuestion } from "@/features/ask-sightline/rate-limit";
import { AskSightlineRepository } from "@/features/ask-sightline/repository";
import { selectRelevantEvidence } from "@/features/ask-sightline/retrieval";
import { deterministicAnswer } from "@/features/ask-sightline/answers";
import type { RiskQuestionProvider } from "@/features/ai/provider";
import { sanitizeUntrustedExcerpt } from "@/features/ai/prompt-security";
import type { ActorContext } from "@/lib/auth/authorization";
import { getServerEnv } from "@/lib/env";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class AskSightlineService {
  private readonly repository: AskSightlineRepository;
  constructor(
    private readonly client: SupabaseClient<AppDatabase>,
    private readonly provider?: RiskQuestionProvider,
  ) {
    this.repository = new AskSightlineRepository(client);
  }

  async history(context: ActorContext, riskId: string) {
    return this.repository.history(context, riskId);
  }

  async ask(context: ActorContext, riskId: string, question: string) {
    if (!allowRiskQuestion(`${context.organizationId}:${context.userId}`))
      throw new Error(
        "Too many questions. Please wait one minute and try again.",
      );
    const [{ conversation, messages }, retrieved] = await Promise.all([
      this.repository.history(context, riskId),
      this.repository.retrieve(context, riskId, question),
    ]);
    const contextInput = riskQuestionContextSchema.parse({
      organizationId: context.organizationId,
      userId: context.userId,
      risk: {
        id: retrieved.risk.id,
        title: retrieved.risk.title,
        summary: retrieved.risk.summary,
        severity: retrieved.risk.severity,
        status: retrieved.risk.status,
        dueAt: iso(retrieved.risk.due_at),
      },
      project: retrieved.project
        ? {
            name: retrieved.project.name,
            projectNumber: retrieved.project.project_number,
            status: retrieved.project.status,
          }
        : null,
      vendor: retrieved.vendor,
      evidence: selectRelevantEvidence(question, retrieved.evidence).map(
        (item) => ({
          id: item.id,
          title: item.title,
          excerpt: sanitizeUntrustedExcerpt(item.excerpt),
          whyItMatters: sanitizeUntrustedExcerpt(item.why_it_matters),
          evidenceType: item.evidence_type,
        }),
      ),
      documents: retrieved.documents.map((item) => ({
        name: item.name,
        documentType: item.document_type,
        documentDate: item.document_date,
      })),
      actions: retrieved.actions.map((item) => ({
        title: sanitizeUntrustedExcerpt(item.title),
        description: sanitizeUntrustedExcerpt(item.description),
        status: item.status,
        dueAt: iso(item.due_at),
      })),
      recentActivity: retrieved.activity.map((item) => ({
        summary: sanitizeUntrustedExcerpt(item.summary),
        occurredAt: iso(item.occurred_at)!,
      })),
      historicalRisks: retrieved.historical.map((item) => ({
        ...item,
        title: sanitizeUntrustedExcerpt(item.title),
      })),
      history: messages.map((item) => ({
        role: item.role,
        content: sanitizeUntrustedExcerpt(item.content),
      })),
      question: sanitizeUntrustedExcerpt(question),
    });
    await this.repository.append(context, {
      organization_id: context.organizationId,
      conversation_id: conversation.id,
      role: "user",
      content: contextInput.question,
    });
    const provider = this.provider ?? configuredProvider();
    let result;
    try {
      result = await provider.answer(contextInput);
      result.output = validateRiskQuestionGrounding(
        riskQuestionOutputSchema.parse(result.output),
        contextInput,
      );
    } catch {
      result = {
        output: deterministicAnswer(contextInput),
        model: "deterministic-analyst-v1",
        latencyMs: 0,
        usage: { inputTokens: null, outputTokens: null, totalTokens: null },
      };
    }
    const answer = await this.repository.append(context, {
      organization_id: context.organizationId,
      conversation_id: conversation.id,
      role: "assistant",
      content: result.output.answer,
      answer_status: result.output.answerStatus,
      evidence_ids: result.output.evidenceCitations,
      confidence: result.output.confidence,
      missing_information: result.output.missingInformation,
      suggested_follow_ups: result.output.suggestedFollowUpQuestions,
      provider:
        result.model === "deterministic-analyst-v1"
          ? "deterministic"
          : provider.name,
      model_name: result.model,
      prompt_version: RISK_QUESTION_PROMPT_VERSION,
      latency_ms: result.latencyMs,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      total_tokens: result.usage.totalTokens,
    });
    await this.repository.prune(context, conversation.id);
    return answer;
  }

  async feedback(
    context: ActorContext,
    messageId: string,
    rating: "helpful" | "not_helpful" | "incorrect",
  ) {
    await this.repository.feedback(context, messageId, rating);
  }
}

function iso(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}
function configuredProvider(): RiskQuestionProvider {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY || process.env.SIGHTLINE_E2E === "true")
    return {
      name: "openai",
      model: env.OPENAI_MODEL ?? "gpt-5.6-terra",
      answer: async () => {
        throw new Error("Provider unavailable.");
      },
    };
  return new OpenAiRiskQuestionProvider(
    env.OPENAI_API_KEY,
    env.OPENAI_MODEL ?? "gpt-5.6-terra",
  );
}
