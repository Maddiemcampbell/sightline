import { z } from "zod";

export const RETENTION_DAY_OPTIONS = {
  softDeleteGraceDays: [7, 14, 30, 60, 90],
  documentRetentionDays: [30, 90, 365, 1095, 2555, 3650],
  activityRetentionDays: [90, 365, 1095, 2555, 3650],
  aiRetentionDays: [30, 90, 180, 365, 1095, 3650],
  auditRetentionDays: [365, 1095, 2555, 3650],
  deletedRecordRetentionDays: [7, 14, 30, 90, 365],
} as const;

export const privacySettingsSchema = z.object({
  softDeleteGraceDays: z.number().int().min(7).max(90),
  documentRetentionDays: z.number().int().min(30).max(3650),
  activityRetentionDays: z.number().int().min(90).max(3650),
  aiRetentionDays: z.number().int().min(30).max(3650),
  auditRetentionDays: z.number().int().min(365).max(3650),
  deletedRecordRetentionDays: z.number().int().min(7).max(365),
});

export const organizationDeletionSchema = z.object({
  scope: z.enum(["organization_only", "organization_all_data"]),
  confirmation: z.string().trim().min(1),
});

export const userDeletionSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

export const cancellationSchema = z.object({
  requestId: z.uuid(),
});
