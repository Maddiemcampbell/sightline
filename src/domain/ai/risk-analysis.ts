import { z } from "zod";

import { RISK_CATEGORIES, RISK_SEVERITIES } from "@/domain/types";

export const AI_PROMPT_VERSION = "risk-analysis-v1";

export const suppliedEvidenceSchema = z.object({
  id: z.string().min(1).max(120),
  documentId: z.uuid().nullable(),
  label: z.string().min(1).max(240),
  excerpt: z.string().min(1).max(4_000),
  observedAt: z.iso.datetime(),
});

export const riskAnalysisInputSchema = z.object({
  organizationId: z.uuid(),
  project: z.object({
    id: z.uuid(),
    name: z.string().min(1).max(200),
    status: z.enum(["planning", "active", "on_hold", "complete", "cancelled"]),
    location: z.string().max(300).nullable(),
  }),
  documentExcerpts: z.array(suppliedEvidenceSchema).max(30),
  existingRiskEvidence: z.array(suppliedEvidenceSchema).max(30),
  historicalRelatedRisks: z
    .array(
      z.object({
        id: z.uuid(),
        title: z.string().min(1).max(240),
        category: z.enum(RISK_CATEGORIES),
        status: z.enum([
          "monitoring",
          "action_needed",
          "in_progress",
          "resolved",
          "dismissed",
        ]),
        outcome: z.string().max(1_000).nullable(),
      }),
    )
    .max(20),
});

const materialClaimReferencesSchema = z.object({
  suggestedRiskTitle: z.array(z.string().min(1)).min(1),
  category: z.array(z.string().min(1)).min(1),
  severity: z.array(z.string().min(1)).min(1),
  confidenceScore: z.array(z.string().min(1)).min(1),
  whyItMatters: z.array(z.string().min(1)).min(1),
  potentialImpactExplanation: z.array(z.string().min(1)).min(1),
  recommendedNextAction: z.array(z.string().min(1)).min(1),
});

export const riskAnalysisOutputSchema = z.object({
  suggestedRiskTitle: z.string().min(1).max(240),
  category: z.enum(RISK_CATEGORIES),
  severity: z.enum(RISK_SEVERITIES),
  confidenceScore: z.number().int().min(0).max(100),
  whyItMatters: z.string().min(1).max(3_000),
  potentialImpactExplanation: z.string().min(1).max(2_000),
  recommendedNextAction: z.string().min(1).max(2_000),
  evidenceReferencesUsed: z.array(z.string().min(1)).min(1),
  claimEvidenceReferences: materialClaimReferencesSchema,
});

export type RiskAnalysisInput = z.infer<typeof riskAnalysisInputSchema>;
export type RiskAnalysisOutput = z.infer<typeof riskAnalysisOutputSchema>;

export function validateEvidenceGrounding(
  output: RiskAnalysisOutput,
  input: RiskAnalysisInput,
): RiskAnalysisOutput {
  const available = new Set(
    [...input.documentExcerpts, ...input.existingRiskEvidence].map(
      (evidence) => evidence.id,
    ),
  );
  const cited = [
    ...output.evidenceReferencesUsed,
    ...Object.values(output.claimEvidenceReferences).flat(),
  ];
  const unavailable = [...new Set(cited.filter((id) => !available.has(id)))];
  if (unavailable.length > 0) {
    throw new Error(
      `Analysis cited unavailable evidence: ${unavailable.join(", ")}`,
    );
  }
  return output;
}
