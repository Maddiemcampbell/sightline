import { z } from "zod";

export const EMAIL_DRAFT_PROMPT_VERSION = "risk-email-draft-v2";
export const EMAIL_TONES = [
  "concise",
  "collaborative",
  "firm",
  "formal",
] as const;
export const EMAIL_URGENCIES = ["routine", "soon", "urgent"] as const;
export const EMAIL_PURPOSES = [
  "initial_request",
  "reminder",
  "escalation",
  "status_update",
] as const;
export const EMAIL_LENGTHS = ["concise", "standard", "detailed"] as const;

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
  generatedAt: z.iso.datetime(),
  recipientRole: z.string().trim().min(2).max(120),
  recipientName: z.string().trim().min(1).max(200).nullable(),
  senderName: z.string().trim().min(1).max(200),
  desiredTone: z.enum(EMAIL_TONES),
  requestedUrgency: z.enum(EMAIL_URGENCIES),
  purpose: z.enum(EMAIL_PURPOSES),
  length: z.enum(EMAIL_LENGTHS),
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
  contactKey: z.string().max(100).nullable().default(null),
  desiredTone: z.enum(EMAIL_TONES),
  requestedUrgency: z.enum(EMAIL_URGENCIES).default("soon"),
  purpose: z.enum(EMAIL_PURPOSES).default("reminder"),
  length: z.enum(EMAIL_LENGTHS).default("standard"),
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
  const projectName = input.project?.name ?? null;
  const vendorName = input.vendor?.name ?? null;
  const due = deadlineState(input.dueDate, input.generatedAt);
  const evidenceClaim = extractGroundedClaim(evidence.excerpt);
  const greeting = input.recipientName
    ? `Hi ${firstName(input.recipientName)},`
    : "Hello,";
  const subject = buildSubject({
    action: input.requestedAction,
    projectName,
    vendorName,
    purpose: input.purpose,
    urgency: due.state === "overdue" ? "urgent" : input.requestedUrgency,
  });
  const request = requestSentence(input.requestedAction, input.desiredTone);
  const context = evidenceSentence(
    evidence.excerpt,
    evidenceClaim,
    input.generatedAt,
  );
  const deadline = deadlineSentence(due, input.requestedUrgency);
  const consequence =
    input.length === "concise" ? null : evidence.whyItMatters.trim();
  const statusOption =
    input.purpose === "reminder" || input.purpose === "escalation"
      ? "If this is already in progress, please reply with the expected delivery date."
      : null;
  const paragraphs = [
    greeting,
    introduction(input.purpose, projectName, vendorName),
    context,
    consequence,
    `${request}${deadline ? ` ${deadline}` : ""}`,
    input.length === "detailed" ? statusOption : null,
    closing(input.desiredTone),
    input.senderName,
  ].filter((value): value is string => Boolean(value));
  const claims = [
    { claim: evidenceClaim, evidenceIds: [evidence.id] },
    ...(consequence && evidence.whyItMatters.includes(consequence)
      ? [{ claim: consequence, evidenceIds: [evidence.id] }]
      : []),
  ];
  return {
    subject: subject.slice(0, 240),
    body: paragraphs.join("\n\n"),
    intendedRecipientRole: input.recipientRole,
    evidenceIdsUsed: [evidence.id],
    suggestedUrgency:
      due.state === "overdue" ? "urgent" : input.requestedUrgency,
    groundedClaims: claims,
  };
}

type Deadline = Readonly<{
  state: "none" | "future" | "today" | "overdue";
  label: string | null;
}>;

export function deadlineState(
  dueDate: string | null,
  generatedAt: string,
): Deadline {
  if (!dueDate) return { state: "none", label: null };
  const due = new Date(dueDate);
  const now = new Date(generatedAt);
  const dueDay = Date.UTC(
    due.getUTCFullYear(),
    due.getUTCMonth(),
    due.getUTCDate(),
  );
  const nowDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(due);
  return {
    state: dueDay < nowDay ? "overdue" : dueDay === nowDay ? "today" : "future",
    label,
  };
}

function buildSubject(input: {
  action: string;
  projectName: string | null;
  vendorName: string | null;
  purpose: EmailDraftInput["purpose"];
  urgency: EmailDraftInput["requestedUrgency"];
}) {
  const action = subjectAction(input.action);
  const scope = input.projectName ? ` - ${input.projectName}` : "";
  const prefix =
    input.purpose === "escalation" || input.urgency === "urgent"
      ? "Action required: "
      : input.purpose === "reminder"
        ? "Follow-up: "
        : input.purpose === "status_update"
          ? "Status requested: "
          : "";
  return `${prefix}${input.vendorName ? `${input.vendorName} - ` : ""}${action}${scope}`;
}

function introduction(
  purpose: EmailDraftInput["purpose"],
  projectName: string | null,
  vendorName: string | null,
) {
  const scope = projectName ? ` for ${projectName}` : "";
  const vendor = vendorName ? ` regarding ${vendorName}` : "";
  if (purpose === "initial_request")
    return `I’m reaching out${vendor}${scope}.`;
  if (purpose === "status_update")
    return `I’m checking on the current status${vendor}${scope}.`;
  if (purpose === "escalation")
    return `I’m following up on an overdue item${vendor}${scope}.`;
  return `I’m following up${vendor}${scope}.`;
}

function evidenceSentence(excerpt: string, claim: string, generatedAt: string) {
  const prefix = excerpt
    .slice(0, Math.max(0, excerpt.indexOf(":")))
    .toLowerCase();
  const evidenceDate = Date.parse(claim);
  const evidenceDeadline = Number.isNaN(evidenceDate)
    ? null
    : deadlineState(new Date(evidenceDate).toISOString(), generatedAt);
  if (prefix.includes("expir") && evidenceDeadline?.state === "overdue")
    return `Our records show the current policy expired on ${claim}.`;
  if (prefix.includes("expir"))
    return `Our records show the current policy expires on ${claim}.`;
  return `Our records show: ${normalizeSentence(excerpt)}`;
}

function deadlineSentence(
  due: Deadline,
  urgency: EmailDraftInput["requestedUrgency"],
) {
  if (due.state === "overdue")
    return "The requested response date has passed, so please send this at your earliest convenience.";
  if (due.state === "today") return "Please respond today.";
  if (due.state === "future") return `Please respond by ${due.label}.`;
  if (urgency === "urgent") return "Please respond as soon as possible.";
  if (urgency === "soon") return "Please respond at your earliest convenience.";
  return "";
}

function requestSentence(action: string, tone: EmailDraftInput["desiredTone"]) {
  const normalized = actionPhrase(action);
  if (tone === "firm") return `Please ${normalized}.`;
  if (tone === "formal")
    return `Please provide ${normalized.replace(/^provide\s+/i, "")}.`;
  return `Could you please ${normalized}?`;
}

function closing(tone: EmailDraftInput["desiredTone"]) {
  if (tone === "collaborative") return "Thanks for your help,";
  if (tone === "formal") return "Sincerely,";
  return "Thank you,";
}

function extractGroundedClaim(excerpt: string) {
  const colon = excerpt.indexOf(":");
  return (colon >= 0 ? excerpt.slice(colon + 1) : excerpt).trim();
}

function normalizeSentence(value: string) {
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? value;
}

function lowerFirst(value: string) {
  return value ? value[0]!.toLowerCase() + value.slice(1) : value;
}

function sentenceCase(value: string) {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

function actionPhrase(value: string) {
  const normalized = value.trim().replace(/[.!?]+$/, "");
  if (/^obtain\s+/i.test(normalized))
    return lowerFirst(normalized.replace(/^obtain\s+/i, "send the "));
  return lowerFirst(normalized);
}

function subjectAction(value: string) {
  const normalized = value.trim().replace(/[.!?]+$/, "");
  const requestedItem = normalized.replace(/^(obtain|provide|send)\s+/i, "");
  if (requestedItem !== normalized)
    return `${sentenceCase(requestedItem)} needed`;
  return sentenceCase(normalized);
}
