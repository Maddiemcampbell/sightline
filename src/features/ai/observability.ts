import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";

export type AiOperationType =
  "risk_analysis" | "email_draft" | "risk_question" | "organization_question";

export type AiObservabilityInput = Readonly<{
  organizationId: string;
  operationType: AiOperationType;
  sourceRecordId?: string;
  provider: string;
  modelName: string;
  promptVersion: string;
  status: "success" | "fallback" | "failure";
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  retrievalCandidateCount?: number;
  retrievalSelectedCount?: number;
  evidenceAvailableCount?: number;
  evidenceCitedCount?: number;
  errorCode?:
    "provider_failure" | "invalid_grounding" | "invalid_output" | undefined;
}>;

/**
 * Records counts and provider metadata only. Content fields are deliberately absent
 * from this API so prompts, excerpts, questions, and generated output cannot be
 * accidentally added to AI monitoring.
 */
export async function recordAiObservability(
  client: SupabaseClient<AppDatabase>,
  input: AiObservabilityInput,
) {
  const { error } = await client.from("ai_observability_events").insert({
    organization_id: input.organizationId,
    operation_type: input.operationType,
    source_record_id: input.sourceRecordId ?? null,
    provider: input.provider,
    model_name: input.modelName,
    prompt_version: input.promptVersion,
    status: input.status,
    latency_ms: input.latencyMs,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    total_tokens: input.totalTokens,
    retrieval_candidate_count: input.retrievalCandidateCount ?? null,
    retrieval_selected_count: input.retrievalSelectedCount ?? null,
    evidence_available_count: input.evidenceAvailableCount ?? null,
    evidence_cited_count: input.evidenceCitedCount ?? null,
    error_code: input.errorCode ?? null,
  });
  if (error)
    throw new Error(`AI telemetry could not be recorded: ${error.message}`);
}

export async function tryRecordAiObservability(
  client: SupabaseClient<AppDatabase>,
  input: AiObservabilityInput,
) {
  try {
    await recordAiObservability(client, input);
  } catch {
    // Observability must never break the customer workflow. Do not log the input:
    // even this metadata should remain inside the protected telemetry store.
    console.error("AI telemetry could not be recorded.");
  }
}
