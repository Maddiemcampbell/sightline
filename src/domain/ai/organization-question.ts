import { z } from "zod";

export const ORGANIZATION_QUESTION_PROMPT_VERSION = "organization-question-v1";
export const ORGANIZATION_ASK_HISTORY_LIMIT = 12;

export const advisorModeSchema = z.enum([
  "project",
  "executive",
  "risk",
  "financial",
  "forecast",
]);
export const organizationQuestionPurposeSchema = z.enum([
  "portfolio_summary",
  "executive_summary",
  "leadership_prep",
  "cost_saving",
  "project_analysis",
  "forecast_analysis",
]);
export const organizationCitationSchema = z.object({
  id: z.string().min(1).max(180),
  entityType: z.enum([
    "project",
    "risk",
    "action",
    "document",
    "evidence",
    "activity",
    "resolution",
    "observation",
    "forecast",
  ]),
  title: z.string().min(1).max(240),
  excerpt: z.string().min(1).max(1_500),
  href: z.string().startsWith("/").max(500),
});
export const organizationQuestionContextSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  advisorMode: advisorModeSchema,
  purpose: organizationQuestionPurposeSchema,
  projectScope: z
    .object({ id: z.uuid(), name: z.string().min(1).max(240) })
    .nullable(),
  citations: z.array(organizationCitationSchema).max(80),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(5_000),
      }),
    )
    .max(ORGANIZATION_ASK_HISTORY_LIMIT),
  question: z.string().trim().min(3).max(800),
});
export const organizationQuestionOutputSchema = z.object({
  answerStatus: z.enum(["answered", "unavailable"]),
  answer: z.string().trim().min(1).max(8_000),
  citationIds: z.array(z.string().min(1).max(180)).max(20),
  confidence: z.number().int().min(0).max(100),
  missingInformation: z.array(z.string().min(1).max(500)).max(8),
  suggestedFollowUpQuestions: z.array(z.string().min(3).max(240)).max(4),
});
export const askOrganizationQuestionSchema = z.object({
  question: z.string().trim().min(3).max(800),
  advisorMode: advisorModeSchema,
  projectId: z.union([z.literal("all"), z.uuid()]).default("all"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(5_000),
      }),
    )
    .max(ORGANIZATION_ASK_HISTORY_LIMIT)
    .default([]),
});

export type OrganizationQuestionContext = z.infer<
  typeof organizationQuestionContextSchema
>;
export type OrganizationQuestionOutput = z.infer<
  typeof organizationQuestionOutputSchema
>;
export type OrganizationCitation = z.infer<typeof organizationCitationSchema>;
export type OrganizationQuestionPurpose = z.infer<
  typeof organizationQuestionPurposeSchema
>;

export function validateOrganizationQuestionGrounding(
  output: OrganizationQuestionOutput,
  context: OrganizationQuestionContext,
): OrganizationQuestionOutput {
  const available = new Map(
    context.citations.map((citation) => [citation.id, citation]),
  );
  const unavailable = output.citationIds.filter((id) => !available.has(id));
  if (unavailable.length)
    throw new Error(
      `Answer cited unavailable sources: ${[...new Set(unavailable)].join(", ")}`,
    );
  if (output.answerStatus === "answered" && !output.citationIds.length)
    throw new Error("Grounded organization answers require citations.");
  if (output.answerStatus === "unavailable" && output.citationIds.length)
    throw new Error("Unavailable answers cannot claim supporting citations.");

  const supportedText = output.citationIds
    .map((id) => available.get(id)?.excerpt ?? "")
    .join(" ")
    .toLocaleLowerCase();
  for (const fact of protectedFacts(output.answer)) {
    const normalized = fact.normalize("NFKC").toLocaleLowerCase();
    if (!supportedText.includes(normalized))
      throw new Error(`Answer included an unsupported protected fact: ${fact}`);
  }
  return output;
}

function protectedFacts(value: string): readonly string[] {
  return (
    value.match(
      /\$\s?\d[\d,]*(?:\.\d{1,2})?|\b\d+(?:\.\d+)?%|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi,
    ) ?? []
  );
}
