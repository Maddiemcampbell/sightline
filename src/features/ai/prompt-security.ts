import type { RiskAnalysisInput } from "@/domain/ai/risk-analysis";

const injectionPatterns = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/gi,
  /(?:system|developer)\s+(?:message|prompt)/gi,
  /you\s+are\s+(?:now|chatgpt|an?\s+ai)/gi,
  /reveal\s+(?:the\s+)?(?:prompt|secret|api\s+key)/gi,
  /<\/?(?:system|assistant|developer|tool)[^>]*>/gi,
];

export function sanitizeUntrustedExcerpt(value: string): string {
  let sanitized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .normalize("NFKC")
    .slice(0, 4_000);
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[UNTRUSTED INSTRUCTION REMOVED]");
  }
  return sanitized.trim();
}

export function sanitizeAnalysisInput(
  input: RiskAnalysisInput,
): RiskAnalysisInput {
  const sanitizeEvidence = <T extends { excerpt: string }>(evidence: T): T => ({
    ...evidence,
    excerpt: sanitizeUntrustedExcerpt(evidence.excerpt),
  });
  return {
    ...input,
    documentExcerpts: input.documentExcerpts.map(sanitizeEvidence),
    existingRiskEvidence: input.existingRiskEvidence.map(sanitizeEvidence),
  };
}
