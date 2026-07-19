import { z } from "zod";

export const EMAIL_DRAFT_PROMPT_VERSION = "risk-email-draft-v1";
export const EMAIL_TONES = [
  "concise",
  "collaborative",
  "firm",
  "formal",
] as const;
export const EMAIL_URGENCIES = ["routine", "soon", "urgent"] as const;

const evidenceSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(240),
  excerpt: z.string().min(1).max(4_000),
  whyItMatters: z.string().min(1).max(3_000),
});

export const emailDraftInputSchema = z.object({
  organizationId: z.uuid(),
  riskId: z.uuid(),
  riskTitle: z.string().min(1).max(240),
  riskSummary: z.string().min(1).max(2_000),
  project: z
    .object({ id: z.uuid(), name: z.string().min(1).max(200) })
    .nullable(),
  vendor: z
    .object({ id: z.uuid(), name: z.string().min(1).max(200) })
    .nullable(),
  evidence: z.array(evidenceSchema).min(1).max(20),
  requestedAction: z.string().min(1).max(2_000),
  dueDate: z.iso.datetime().nullable(),
  recipientRole: z.string().trim().min(2).max(120),
  desiredTone: z.enum(EMAIL_TONES),
});

const groundedClaimSchema = z.object({
  claim: z.string().min(1).max(1_000),
  evidenceIds: z.array(z.uuid()).min(1),
});

export const emailDraftOutputSchema = z.object({
  subject: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(10_000),
  intendedRecipientRole: z.string().trim().min(2).max(120),
  evidenceIdsUsed: z.array(z.uuid()).min(1),
  suggestedUrgency: z.enum(EMAIL_URGENCIES),
  groundedClaims: z.array(groundedClaimSchema).min(1).max(20),
});

export const generateEmailDraftSchema = z.object({
  riskId: z.uuid(),
  actionId: z.uuid().nullable().default(null),
  recipientRole: z.string().trim().min(2).max(120),
  desiredTone: z.enum(EMAIL_TONES),
});

export const saveEmailDraftSchema = z.object({
  draftId: z.uuid(),
  subject: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(10_000),
  contactKey: z.string().max(100).nullable(),
});

export type EmailDraftInput = z.infer<typeof emailDraftInputSchema>;
export type EmailDraftOutput = z.infer<typeof emailDraftOutputSchema>;

export function validateEmailDraftGrounding(
  output: EmailDraftOutput,
  input: EmailDraftInput,
) {
  const available = new Set(input.evidence.map((item) => item.id));
  const references = [
    ...output.evidenceIdsUsed,
    ...output.groundedClaims.flatMap((claim) => claim.evidenceIds),
  ];
  const unavailable = [
    ...new Set(references.filter((id) => !available.has(id))),
  ];
  if (unavailable.length)
    throw new Error(
      `Email draft cited unavailable evidence: ${unavailable.join(", ")}`,
    );
  for (const claim of output.groundedClaims) {
    if (
      !output.body.includes(claim.claim) &&
      !output.subject.includes(claim.claim)
    )
      throw new Error(
        "Email draft grounding metadata referenced a claim not present in the draft.",
      );
    const supported = claim.evidenceIds.some((id) => {
      const evidence = input.evidence.find((item) => item.id === id);
      return (
        evidence?.excerpt.includes(claim.claim) ||
        evidence?.whyItMatters.includes(claim.claim)
      );
    });
    if (!supported)
      throw new Error(
        "Email draft included a claim not contained in its cited evidence.",
      );
  }
  return output;
}

export function deterministicEmailDraft(
  input: EmailDraftInput,
): EmailDraftOutput {
  const evidence = input.evidence[0]!;
  const project = input.project ? ` for ${input.project.name}` : "";
  const vendor = input.vendor ? `${input.vendor.name}: ` : "";
  const due = input.dueDate
    ? ` Please respond by ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(input.dueDate))}.`
    : "";
  const claim = evidence.excerpt;
  return {
    subject: `${vendor}${input.requestedAction}`.slice(0, 240),
    body: `Hello,\n\nI’m following up${project}. ${claim}\n\nPlease ${input.requestedAction.toLowerCase()}.${due}\n\nThank you,\nMatt Anderson`,
    intendedRecipientRole: input.recipientRole,
    evidenceIdsUsed: [evidence.id],
    suggestedUrgency: input.dueDate ? "soon" : "routine",
    groundedClaims: [{ claim, evidenceIds: [evidence.id] }],
  };
}
