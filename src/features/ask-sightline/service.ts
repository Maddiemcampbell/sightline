import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  RISK_QUESTION_PROMPT_VERSION,
  riskQuestionContextSchema,
  riskQuestionOutputSchema,
  validateRiskQuestionGrounding,
} from "@/domain/ai/risk-question";
import {
  ORGANIZATION_QUESTION_PROMPT_VERSION,
  organizationQuestionOutputSchema,
  validateOrganizationQuestionGrounding,
  type OrganizationQuestionContext,
} from "@/domain/ai/organization-question";
import { OpenAiRiskQuestionProvider } from "@/features/ask-sightline/openai-provider";
import { tryRecordAiObservability } from "@/features/ai/observability";
import { allowRiskQuestion } from "@/features/ask-sightline/rate-limit";
import { AskSightlineRepository } from "@/features/ask-sightline/repository";
import { selectRelevantEvidence } from "@/features/ask-sightline/retrieval";
import {
  deterministicAnswer,
  deterministicOrganizationAnswer,
} from "@/features/ask-sightline/answers";
import type {
  OrganizationQuestionProvider,
  RiskQuestionProvider,
} from "@/features/ai/provider";
import { sanitizeUntrustedExcerpt } from "@/features/ai/prompt-security";
import {
  canViewFinancialExposure,
  type ActorContext,
} from "@/lib/auth/authorization";
import { getServerEnv } from "@/lib/env";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { AdvisorMode } from "@/features/workspace/types";
import { buildOrganizationQuestionContext } from "@/features/ask-sightline/organization-context";
import { routeOrganizationAdvisorMode } from "@/features/ask-sightline/prompt-templates";
import { FinancialAnalyticsRepository } from "@/features/financial-analytics/repository";
import { FinancialAnalyticsService } from "@/features/financial-analytics/service";
import { RiskAnalyticsRepository } from "@/features/risk-analytics/repository";
import { RiskAnalyticsService } from "@/features/risk-analytics/service";

export class AskSightlineService {
  private readonly repository: AskSightlineRepository;
  constructor(
    private readonly client: SupabaseClient<AppDatabase>,
    private readonly provider?: RiskQuestionProvider,
    private readonly organizationProvider?: OrganizationQuestionProvider,
  ) {
    this.repository = new AskSightlineRepository(client);
  }

  async history(context: ActorContext, riskId: string) {
    return this.repository.history(context, riskId);
  }

  async ask(
    context: ActorContext,
    riskId: string,
    question: string,
    advisorMode: AdvisorMode = "risk",
  ) {
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
      advisorMode,
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
    let usedFallback = false;
    let result;
    try {
      result = await provider.answer(contextInput);
      result.output = validateRiskQuestionGrounding(
        riskQuestionOutputSchema.parse(result.output),
        contextInput,
      );
    } catch {
      usedFallback = true;
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
    await tryRecordAiObservability(this.client, {
      organizationId: context.organizationId,
      operationType: "risk_question",
      sourceRecordId: answer.id,
      provider: usedFallback ? "deterministic" : provider.name,
      modelName: result.model,
      promptVersion: ORGANIZATION_QUESTION_PROMPT_VERSION,
      status: usedFallback ? "fallback" : "success",
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      retrievalCandidateCount: retrieved.evidence.length,
      retrievalSelectedCount: contextInput.evidence.length,
      evidenceAvailableCount: contextInput.evidence.length,
      evidenceCitedCount: new Set(result.output.evidenceCitations).size,
      errorCode: usedFallback ? "provider_failure" : undefined,
    });
    await this.repository.prune(context, conversation.id);
    return answer;
  }

  async askOrganization(
    context: ActorContext,
    input: {
      question: string;
      advisorMode: AdvisorMode;
      projectId: string | null;
      history: OrganizationQuestionContext["history"];
    },
  ) {
    if (
      !allowRiskQuestion(
        `${context.organizationId}:${context.userId}:organization`,
      )
    )
      throw new Error(
        "Too many questions. Please wait one minute and try again.",
      );
    const canViewFinancials = canViewFinancialExposure(context);
    const routedAdvisorMode = routeOrganizationAdvisorMode({
      question: input.question,
      selectedMode: input.advisorMode,
    });
    const [retrieved, financialAnalytics, riskAnalytics] = await Promise.all([
      this.repository.retrieveOrganization(context, input.projectId),
      canViewFinancials
        ? new FinancialAnalyticsService(
            new FinancialAnalyticsRepository(this.client),
          ).getOrganizationAnalytics({
            context,
            projectId: input.projectId,
          })
        : Promise.resolve(null),
      new RiskAnalyticsService(
        new RiskAnalyticsRepository(this.client),
      ).getOrganizationAnalytics({
        context,
        projectId: input.projectId,
      }),
    ]);
    const questionContext = buildOrganizationQuestionContext({
      context,
      retrieved,
      question: input.question,
      advisorMode: routedAdvisorMode,
      history: input.history,
      projectId: input.projectId,
      canViewFinancials,
      financialAnalytics,
      riskAnalytics,
      now: new Date(),
    });
    const provider =
      this.organizationProvider ?? configuredOrganizationProvider();
    let usedFallback = false;
    let result;
    try {
      result = await provider.answerOrganization(questionContext);
      result.output = validateOrganizationQuestionGrounding(
        organizationQuestionOutputSchema.parse(result.output),
        questionContext,
      );
    } catch {
      usedFallback = true;
      result = {
        output: validateOrganizationQuestionGrounding(
          deterministicOrganizationAnswer(questionContext),
          questionContext,
        ),
        model: "deterministic-organization-analyst-v1",
        latencyMs: 0,
        usage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
        },
      };
    }
    const citations = new Map(
      questionContext.citations.map((citation) => [citation.id, citation]),
    );
    await tryRecordAiObservability(this.client, {
      organizationId: context.organizationId,
      operationType: "organization_question",
      provider: usedFallback ? "deterministic" : provider.name,
      modelName: result.model,
      promptVersion: RISK_QUESTION_PROMPT_VERSION,
      status: usedFallback ? "fallback" : "success",
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      retrievalCandidateCount: questionContext.citations.length,
      retrievalSelectedCount: questionContext.citations.length,
      evidenceAvailableCount: questionContext.citations.length,
      evidenceCitedCount: new Set(result.output.citationIds).size,
      errorCode: usedFallback ? "provider_failure" : undefined,
    });
    return {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      content: result.output.answer,
      citations: result.output.citationIds.flatMap((id) => {
        const citation = citations.get(id);
        return citation ? [citation] : [];
      }),
      confidence: result.output.confidence,
      missingInformation: result.output.missingInformation,
      suggestedFollowUps: result.output.suggestedFollowUpQuestions,
      routedAdvisorMode,
    };
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

function configuredOrganizationProvider(): OrganizationQuestionProvider {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY || process.env.SIGHTLINE_E2E === "true")
    return {
      name: "openai",
      model: env.OPENAI_MODEL ?? "gpt-5.6-terra",
      answerOrganization: async () => {
        throw new Error("Provider unavailable.");
      },
    };
  return new OpenAiRiskQuestionProvider(
    env.OPENAI_API_KEY,
    env.OPENAI_MODEL ?? "gpt-5.6-terra",
  );
}
