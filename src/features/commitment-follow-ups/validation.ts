import { z } from "zod";

export const trackCommitmentSchema = z.object({
  draftId: z.uuid(),
  requestedCommitment: z.string().trim().min(3).max(1_000),
  expectedResponseAt: z.iso.datetime(),
});

export const recordCommitmentResponseSchema = z.object({
  followUpId: z.uuid(),
  evidenceId: z.uuid(),
  note: z.string().trim().max(2_000).default(""),
});

export const verifyCommitmentResponseSchema = z.object({
  followUpId: z.uuid(),
});
