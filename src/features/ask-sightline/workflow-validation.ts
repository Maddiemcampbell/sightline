import { z } from "zod";

export const applyAskActionProposalSchema = z
  .object({
    proposalId: z.uuid(),
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            title: z.string().trim().min(1).max(240),
            description: z.string().trim().min(1).max(2000),
            riskId: z.uuid(),
            ownerUserId: z.uuid().nullable(),
            priority: z.enum(["low", "normal", "high", "urgent"]),
            dueDate: z.union([z.iso.date(), z.literal("")]),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();

export type ApplyAskActionProposalInput = z.input<
  typeof applyAskActionProposalSchema
>;

export type ApplyAskActionProposalResult = Readonly<{
  itemId: string;
  status: "created" | "failed";
  actionId: string | null;
  alreadyCreated: boolean;
  error: string | null;
}>;

export const applyAskMeetingProposalSchema = z.object({
  title: z.string().trim().min(3).max(160),
  meetingType: z.enum([
    "weekly_executive_review",
    "monthly_portfolio_review",
    "project_owner_meeting",
    "lender_board_update",
    "risk_committee_briefing",
  ]),
  startsAt: z.iso.datetime({ local: true }),
  projectIds: z.array(z.uuid()).max(50),
});

export const applyAskEmailProposalSchema = z.object({
  riskId: z.uuid(),
  recipientRole: z.string().trim().min(2).max(120),
  desiredTone: z.enum(["concise", "collaborative", "firm", "formal"]),
  requestedUrgency: z.enum(["routine", "soon", "urgent"]),
  purpose: z.enum([
    "initial_request",
    "reminder",
    "escalation",
    "status_update",
  ]),
  length: z.enum(["concise", "standard", "detailed"]),
  subject: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(10_000),
});
