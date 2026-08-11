import { z } from "zod";

export const exceptionRuleSettingsSchema = z.object({
  marginEnabled: z.boolean(),
  marginFloorPercent: z.coerce.number().min(-100).max(100),
  budgetEnabled: z.boolean(),
  budgetVariancePercent: z.coerce.number().min(0).max(100),
  unownedRiskEnabled: z.boolean(),
  actionDueEnabled: z.boolean(),
  actionDueDays: z.coerce.number().int().min(0).max(90),
  documentExpiryEnabled: z.boolean(),
  documentExpiryDays: z.coerce.number().int().min(0).max(365),
  syncStaleEnabled: z.boolean(),
  syncStaleHours: z.coerce.number().int().min(1).max(720),
  forecastStaleEnabled: z.boolean(),
  forecastStaleDays: z.coerce.number().int().min(1).max(180),
});
