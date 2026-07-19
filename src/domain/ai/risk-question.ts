import { z } from "zod";

export const RISK_QUESTION_PROMPT_VERSION = "risk-question-v1";
export const ASK_HISTORY_LIMIT = 20;
export const ASK_SUGGESTED_QUESTIONS = [
  "Why is this high risk?",
  "What evidence supports this?",
  "What should we do next?",
  "What information is missing?",
] as const;

const citedEvidenceSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(240),
  excerpt: z.string().min(1).max(4_000),
  whyItMatters: z.string().min(1).max(3_000),
  evidenceType: z.string().min(1).max(80),
});

export const riskQuestionContextSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  risk: z.object({
    id: z.uuid(),
    title: z.string(),
    summary: z.string(),
    severity: z.string(),
    status: z.string(),
    dueAt: z.string().nullable(),
  }),
  project: z
    .object({ name: z.string(), projectNumber: z.string(), status: z.string() })
    .nullable(),
  vendor: z
    .object({ name: z.string(), trade: z.string().nullable() })
    .nullable(),
  evidence: z.array(citedEvidenceSchema).max(8),
  documents: z
    .array(
      z.object({
        name: z.string(),
        documentType: z.string(),
        documentDate: z.string().nullable(),
      }),
    )
    .max(8),
  actions: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        status: z.string(),
        dueAt: z.string().nullable(),
      }),
    )
    .max(5),
  recentActivity: z
    .array(z.object({ summary: z.string(), occurredAt: z.string() }))
    .max(5),
  historicalRisks: z
    .array(z.object({ title: z.string(), status: z.string() }))
    .max(5),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10_000),
      }),
    )
    .max(ASK_HISTORY_LIMIT),
  question: z.string().trim().min(3).max(500),
});

export const riskQuestionOutputSchema = z.object({
  answerStatus: z.enum(["answered", "unavailable"]),
  answer: z.string().trim().min(1).max(5_000),
  evidenceCitations: z.array(z.uuid()).max(8),
  confidence: z.number().int().min(0).max(100),
  missingInformation: z.array(z.string().min(1).max(500)).max(8),
  suggestedFollowUpQuestions: z.array(z.string().min(3).max(240)).max(4),
});

export const askRiskQuestionSchema = z.object({
  riskId: z.uuid(),
  question: z.string().trim().min(3).max(500),
});
export const feedbackSchema = z.object({
  messageId: z.uuid(),
  rating: z.enum(["helpful", "not_helpful", "incorrect"]),
});

export type RiskQuestionContext = z.infer<typeof riskQuestionContextSchema>;
export type RiskQuestionOutput = z.infer<typeof riskQuestionOutputSchema>;

export function validateRiskQuestionGrounding(
  output: RiskQuestionOutput,
  context: RiskQuestionContext,
) {
  const available = new Set(context.evidence.map((item) => item.id));
  const unavailable = output.evidenceCitations.filter(
    (id) => !available.has(id),
  );
  if (unavailable.length)
    throw new Error(
      `Answer cited unavailable evidence: ${[...new Set(unavailable)].join(", ")}`,
    );
  if (output.answerStatus === "answered" && !output.evidenceCitations.length)
    throw new Error("Factual answers require at least one evidence citation.");
  if (output.answerStatus === "unavailable" && output.evidenceCitations.length)
    throw new Error("Unavailable answers cannot claim supporting evidence.");
  const cited = context.evidence.filter((item) =>
    output.evidenceCitations.includes(item.id),
  );
  const supportedText = cited
    .flatMap((item) => [item.title, item.excerpt, item.whyItMatters])
    .join(" ")
    .toLowerCase();
  for (const fact of protectedFacts(output.answer)) {
    if (!supportedText.includes(fact.toLowerCase()))
      throw new Error(`Answer included an unsupported protected fact: ${fact}`);
  }
  return output;
}

function protectedFacts(value: string) {
  return (
    value.match(
      /\$\s?\d[\d,]*(?:\.\d{2})?|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi,
    ) ?? []
  );
}
