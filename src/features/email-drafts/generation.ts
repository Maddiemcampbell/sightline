import {
  deterministicEmailDraft,
  emailDraftOutputSchema,
  validateEmailDraftGrounding,
  type EmailDraftInput,
} from "@/domain/ai/email-draft";
import type { EmailDraftProvider } from "@/features/ai/provider";

export async function generateEmailDraftWithFallback(
  provider: EmailDraftProvider,
  input: EmailDraftInput,
) {
  try {
    const result = await provider.draft(input);
    return {
      ...result,
      output: validateEmailDraftGrounding(
        emailDraftOutputSchema.parse(result.output),
        input,
      ),
      generationSource: "ai" as const,
    };
  } catch {
    return {
      output: deterministicEmailDraft(input),
      model: "deterministic-template-v1",
      latencyMs: 0,
      usage: { inputTokens: null, outputTokens: null, totalTokens: null },
      generationSource: "deterministic_fallback" as const,
    };
  }
}
