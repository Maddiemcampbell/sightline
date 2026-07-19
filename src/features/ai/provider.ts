import type {
  RiskAnalysisInput,
  RiskAnalysisOutput,
} from "@/domain/ai/risk-analysis";

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
