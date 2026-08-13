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
