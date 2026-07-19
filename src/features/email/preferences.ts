import { z } from "zod";

import { isValidTimezone } from "@/features/email/delivery-time";

export const emailPreferencesSchema = z.object({
  enabled: z.boolean(),
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(isValidTimezone, "Invalid timezone"),
});
