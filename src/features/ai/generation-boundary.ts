import type { LlmUsage } from "@/features/ai/provider";

export type GroundedEvidenceReference = Readonly<{
  id: string;
  label: string;
  excerpt: string;
}>;

export type AiGenerationPurpose = "risk_email_draft" | "risk_question_answer";

export type GroundedGenerationRequest = Readonly<{
  purpose: AiGenerationPurpose;
  organizationId: string;
  riskId: string;
  instruction: string;
  evidence: readonly GroundedEvidenceReference[];
}>;

export type GroundedGenerationResult = Readonly<{
  content: string;
  evidenceReferencesUsed: readonly string[];
  model: string;
  promptVersion: string;
  latencyMs: number;
  usage: LlmUsage;
}>;

export interface GroundedGenerationService {
  generate(
    request: GroundedGenerationRequest,
  ): Promise<GroundedGenerationResult>;
}
