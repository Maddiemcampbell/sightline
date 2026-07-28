import { z } from "zod";
import { RELEASE_STATUSES } from "./types";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

export const createReleaseSchema = z.object({
  identifier: z.string().trim().min(2).max(120),
  applicationVersion: z.string().trim().min(1).max(120),
  environment: z.string().trim().min(1).max(80),
  status: z.enum(RELEASE_STATUSES),
  deployedAt: z.iso.datetime({ offset: true }).nullable(),
  commitSha: optionalText(80),
  sourceReference: optionalText(240),
  deployedBy: optionalText(160),
  releaseNotes: z.string().trim().max(10_000),
  featureFlagIds: z.array(z.uuid()).max(100),
});

export const updateReleaseSchema = z.object({
  status: z.enum(RELEASE_STATUSES),
  releaseNotes: z.string().trim().max(10_000),
  rollbackStatus: z.enum([
    "not_rolled_back",
    "rollback_pending",
    "rolled_back",
  ]),
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
