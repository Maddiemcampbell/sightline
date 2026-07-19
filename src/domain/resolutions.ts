import { z } from "zod";

export const RESOLUTION_TYPES = [
  "prevented",
  "mitigated",
  "accepted",
  "transferred",
  "expired",
  "false_positive",
  "duplicate",
  "no_longer_relevant",
  "other",
] as const;

export const resolveRiskSchema = z
  .object({
    riskId: z.uuid(),
    summary: z.string().trim().min(10).max(3_000),
    resolutionType: z.enum(RESOLUTION_TYPES),
    finalOwnerUserId: z.uuid(),
    resolvedDate: z.iso.date(),
    completedActionIds: z.array(z.uuid()).max(100).default([]),
    exposureBeforeCents: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    remainingExposureCents: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER),
    estimatedLossAvoidedCents: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER),
    warningUseful: z.boolean(),
    predictionAccurate: z.boolean(),
    internalNotes: z.string().trim().max(5_000).nullable().default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.remainingExposureCents > value.exposureBeforeCents)
      context.addIssue({
        code: "custom",
        path: ["remainingExposureCents"],
        message: "Remaining exposure cannot exceed exposure before resolution",
      });
    if (
      new Set(value.completedActionIds).size !== value.completedActionIds.length
    )
      context.addIssue({
        code: "custom",
        path: ["completedActionIds"],
        message: "Completed actions must be unique",
      });
  });

export const reopenRiskSchema = z
  .object({
    riskId: z.uuid(),
    reason: z.string().trim().min(10).max(2_000),
  })
  .strict();

export type ResolveRiskInput = z.infer<typeof resolveRiskSchema>;

export type ResolutionValueRow = Readonly<{
  exposureBeforeCents: number;
  remainingExposureCents: number;
  estimatedLossAvoidedCents: number;
  detectedAt: string;
  resolvedAt: string;
}>;

export function calculateResolutionValueSummary(
  rows: readonly ResolutionValueRow[],
) {
  const totalResolutionMs = rows.reduce(
    (sum, row) =>
      sum +
      Math.max(0, Date.parse(row.resolvedAt) - Date.parse(row.detectedAt)),
    0,
  );
  return {
    risksResolved: rows.length,
    estimatedExposureReducedCents: rows.reduce(
      (sum, row) =>
        sum + Math.max(0, row.exposureBeforeCents - row.remainingExposureCents),
      0,
    ),
    estimatedLossAvoidedCents: rows.reduce(
      (sum, row) => sum + row.estimatedLossAvoidedCents,
      0,
    ),
    averageResolutionHours: rows.length
      ? Math.round(totalResolutionMs / rows.length / 3_600_000)
      : 0,
  };
}
