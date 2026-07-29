import "server-only";

import {
  AI_PROMPT_VERSION,
  riskAnalysisInputSchema,
  riskAnalysisOutputSchema,
  validateEvidenceGrounding,
  type RiskAnalysisInput,
  type RiskAnalysisOutput,
} from "@/domain/ai/risk-analysis";
import { OpenAiRiskAnalysisProvider } from "@/features/ai/openai-provider";
import { tryRecordAiObservability } from "@/features/ai/observability";
import type { RiskAnalysisProvider } from "@/features/ai/provider";
import { sanitizeAnalysisInput } from "@/features/ai/prompt-security";
import {
  assertSameOrganization,
  type ActorContext,
} from "@/lib/auth/authorization";
import { getServerEnv } from "@/lib/env";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AnalysisRequest = {
  context: ActorContext;
  input: RiskAnalysisInput;
  deterministicFallback?: RiskAnalysisOutput;
  provider?: RiskAnalysisProvider;
};

export async function createRiskAnalysisSuggestion(request: AnalysisRequest) {
  const input = sanitizeAnalysisInput(
    riskAnalysisInputSchema.parse(request.input),
  );
  assertSameOrganization(request.context, input.organizationId);
  const provider = request.provider ?? configuredProvider();
  let output: RiskAnalysisOutput;
  let status: "complete" | "fallback" = "complete";
  let model = provider.model;
  let latencyMs = 0;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let totalTokens: number | null = null;
  let providerError: string | null = null;

  try {
    const result = await provider.analyze(input);
    output = validateEvidenceGrounding(
      riskAnalysisOutputSchema.parse(result.output),
      input,
    );
    model = result.model;
    latencyMs = result.latencyMs;
    inputTokens = result.usage.inputTokens;
    outputTokens = result.usage.outputTokens;
    totalTokens = result.usage.totalTokens;
  } catch (error) {
    providerError =
      error instanceof Error ? error.message : "Unknown provider error";
    if (!request.deterministicFallback) {
      await recordFailedRun(input, provider, providerError);
      throw error;
    }
    output = validateEvidenceGrounding(
      riskAnalysisOutputSchema.parse(request.deterministicFallback),
      input,
    );
    status = "fallback";
    model = "deterministic-rules-v1";
  }

  const client = await createServerSupabaseClient();
  const { data: run, error: runError } = await client
    .from("ai_analysis_runs")
    .insert({
      organization_id: input.organizationId,
      project_id: input.project.id,
      provider: status === "fallback" ? "deterministic" : provider.name,
      model_name: model,
      prompt_version: AI_PROMPT_VERSION,
      status,
      input_snapshot: analysisInputMetadata(input),
      output_snapshot: analysisOutputMetadata(output),
      latency_ms: latencyMs,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      error_message: providerError ? "provider_failure" : null,
    })
    .select("id")
    .single();
  if (runError || !run)
    throw new Error(runError?.message ?? "Analysis run was not stored.");
  const { data: suggestion, error: suggestionError } = await client
    .from("ai_risk_suggestions")
    .insert({
      organization_id: input.organizationId,
      project_id: input.project.id,
      analysis_run_id: run.id,
      review_status: "pending",
      suggested_risk: output as unknown as Json,
      review_context: input as unknown as Json,
    })
    .select("id,review_status")
    .single();
  if (suggestionError || !suggestion)
    throw new Error(suggestionError?.message ?? "Suggestion was not stored.");
  const availableEvidenceCount = evidenceCount(input);
  await tryRecordAiObservability(client, {
    organizationId: input.organizationId,
    operationType: "risk_analysis",
    sourceRecordId: run.id,
    provider: status === "fallback" ? "deterministic" : provider.name,
    modelName: model,
    promptVersion: AI_PROMPT_VERSION,
    status: status === "complete" ? "success" : "fallback",
    latencyMs,
    inputTokens,
    outputTokens,
    totalTokens,
    retrievalCandidateCount: availableEvidenceCount,
    retrievalSelectedCount: availableEvidenceCount,
    evidenceAvailableCount: availableEvidenceCount,
    evidenceCitedCount: new Set(output.evidenceReferencesUsed).size,
    errorCode: status === "fallback" ? "provider_failure" : undefined,
  });
  return suggestion;
}

async function recordFailedRun(
  input: RiskAnalysisInput,
  provider: RiskAnalysisProvider,
  errorMessage: string,
) {
  const client = await createServerSupabaseClient();
  const { data: run, error } = await client
    .from("ai_analysis_runs")
    .insert({
      organization_id: input.organizationId,
      project_id: input.project.id,
      provider: provider.name,
      model_name: provider.model,
      prompt_version: AI_PROMPT_VERSION,
      status: "failed",
      input_snapshot: analysisInputMetadata(input),
      output_snapshot: null,
      latency_ms: 0,
      error_message: "provider_failure",
    })
    .select("id")
    .single();
  if (error)
    console.error("Could not persist failed AI analysis run", error.message);
  if (!error && run) {
    const count = evidenceCount(input);
    await tryRecordAiObservability(client, {
      organizationId: input.organizationId,
      operationType: "risk_analysis",
      sourceRecordId: run.id,
      provider: provider.name,
      modelName: provider.model,
      promptVersion: AI_PROMPT_VERSION,
      status: "failure",
      latencyMs: 0,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      retrievalCandidateCount: count,
      retrievalSelectedCount: count,
      evidenceAvailableCount: count,
      evidenceCitedCount: 0,
      errorCode: classifyProviderError(errorMessage),
    });
  }
}

export function analysisInputMetadata(input: RiskAnalysisInput): Json {
  return {
    organizationId: input.organizationId,
    projectId: input.project.id,
    documentExcerptCount: input.documentExcerpts.length,
    existingRiskEvidenceCount: input.existingRiskEvidence.length,
    historicalRiskCount: input.historicalRelatedRisks.length,
  };
}

function analysisOutputMetadata(output: RiskAnalysisOutput): Json {
  return {
    category: output.category,
    severity: output.severity,
    confidenceScore: output.confidenceScore,
    evidenceReferenceCount: new Set(output.evidenceReferencesUsed).size,
  };
}

function evidenceCount(input: RiskAnalysisInput) {
  return input.documentExcerpts.length + input.existingRiskEvidence.length;
}

function classifyProviderError(
  message: string,
): "provider_failure" | "invalid_grounding" | "invalid_output" {
  if (/evidence|ground/i.test(message)) return "invalid_grounding";
  if (/zod|parse|schema|invalid/i.test(message)) return "invalid_output";
  return "provider_failure";
}

function configuredProvider(): RiskAnalysisProvider {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    return {
      name: "openai",
      model: env.OPENAI_MODEL ?? "gpt-5.6-terra",
      analyze: async () => {
        throw new Error("OPENAI_API_KEY is not configured.");
      },
    };
  }
  return new OpenAiRiskAnalysisProvider(
    env.OPENAI_API_KEY,
    env.OPENAI_MODEL ?? "gpt-5.6-terra",
  );
}
