import type {
  RiskAnalysisInput,
  RiskAnalysisOutput,
} from "@/domain/ai/risk-analysis";
import type {
  EmailDraftInput,
  EmailDraftOutput,
} from "@/domain/ai/email-draft";

export type LlmUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type LlmAnalysisResult = {
  output: RiskAnalysisOutput;
  model: string;
  latencyMs: number;
  usage: LlmUsage;
};

export interface RiskAnalysisProvider {
  readonly name: string;
  readonly model: string;
  analyze(input: RiskAnalysisInput): Promise<LlmAnalysisResult>;
}

export type LlmEmailDraftResult = {
  output: EmailDraftOutput;
  model: string;
  latencyMs: number;
  usage: LlmUsage;
};

export interface EmailDraftProvider {
  readonly name: string;
  readonly model: string;
  draft(input: EmailDraftInput): Promise<LlmEmailDraftResult>;
}
