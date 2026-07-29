import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { recordAiObservability } from "@/features/ai/observability";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

describe("AI observability", () => {
  it("records privacy-safe counts and provider metadata without content", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient<AppDatabase>;

    await recordAiObservability(client, {
      organizationId: "org-1",
      operationType: "risk_question",
      sourceRecordId: "answer-1",
      provider: "openai",
      modelName: "test-model",
      promptVersion: "risk-question-v1",
      status: "success",
      latencyMs: 240,
      inputTokens: 50,
      outputTokens: 20,
      totalTokens: 70,
      retrievalCandidateCount: 8,
      retrievalSelectedCount: 3,
      evidenceAvailableCount: 3,
      evidenceCitedCount: 2,
    });

    expect(insert).toHaveBeenCalledOnce();
    const recorded = insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(recorded).toMatchObject({
      operation_type: "risk_question",
      retrieval_candidate_count: 8,
      retrieval_selected_count: 3,
      evidence_available_count: 3,
      evidence_cited_count: 2,
    });
    expect(Object.keys(recorded)).not.toEqual(
      expect.arrayContaining([
        "prompt",
        "question",
        "answer",
        "excerpt",
        "document_content",
      ]),
    );
  });

  it("surfaces storage failures without echoing telemetry content", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: "denied" } }),
      }),
    } as unknown as SupabaseClient<AppDatabase>;

    await expect(
      recordAiObservability(client, {
        organizationId: "org-1",
        operationType: "email_draft",
        provider: "deterministic",
        modelName: "template-v1",
        promptVersion: "draft-v1",
        status: "fallback",
        latencyMs: 0,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      }),
    ).rejects.toThrow("AI telemetry could not be recorded: denied");
  });
});
