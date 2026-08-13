import { z } from "zod";

export const MEETING_ADVISOR_PROMPT_VERSION = "meeting-advisor-v1";

export const meetingAdvisorModeSchema = z.enum([
  "briefing",
  "facilitation",
  "closeout",
  "recap",
]);

export const meetingAdvisorCitationSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  excerpt: z.string().min(1).max(2_000),
  href: z.string().startsWith("/").max(600),
});

export const meetingAdvisorContextSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  meetingId: z.uuid(),
  mode: meetingAdvisorModeSchema,
  meeting: z.object({
    title: z.string().min(1).max(200),
    type: z.string().min(1).max(100),
    status: z.string().min(1).max(100),
    startsAt: z.iso.datetime(),
    projectCount: z.number().int().nonnegative(),
  }),
  citations: z.array(meetingAdvisorCitationSchema).min(1).max(80),
  decisionCount: z.number().int().nonnegative(),
  actionCount: z.number().int().nonnegative(),
  notes: z.string().trim().max(8_000),
});

const advisorItemSchema = z.object({
  label: z.string().min(1).max(160),
  detail: z.string().min(1).max(1_200),
  citationIds: z.array(z.string().min(1).max(200)).max(8),
});

export const meetingAdvisorOutputSchema = z.object({
  headline: z.string().min(1).max(300),
  overview: z.string().min(1).max(3_000),
  items: z.array(advisorItemSchema).min(1).max(8),
  decisionDraft: z
    .object({
      summary: z.string().min(1).max(1_000),
      rationale: z.string().min(1).max(3_000),
    })
    .nullable(),
  followUpDraft: z
    .object({
      title: z.string().min(1).max(240),
      definitionOfDone: z.string().min(1).max(1_500),
    })
    .nullable(),
  recapSubject: z.string().min(1).max(240).nullable(),
  recapDraft: z.string().min(1).max(8_000).nullable(),
  confidence: z.number().int().min(0).max(100),
  missingInformation: z.array(z.string().min(1).max(500)).max(8),
});

export type MeetingAdvisorMode = z.infer<typeof meetingAdvisorModeSchema>;
export type MeetingAdvisorContext = z.infer<typeof meetingAdvisorContextSchema>;
export type MeetingAdvisorOutput = z.infer<typeof meetingAdvisorOutputSchema>;

export function validateMeetingAdvisorGrounding(
  output: MeetingAdvisorOutput,
  context: MeetingAdvisorContext,
) {
  const available = new Set(context.citations.map((citation) => citation.id));
  const used = output.items.flatMap((item) => item.citationIds);
  const unavailable = used.filter((id) => !available.has(id));
  if (unavailable.length)
    throw new Error(
      `Meeting advisor cited unavailable sources: ${[...new Set(unavailable)].join(", ")}`,
    );
  if (!used.length)
    throw new Error("Meeting advisor output requires at least one citation.");
  return output;
}
