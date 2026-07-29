import { z } from "zod";

import { EXPORT_FORMATS } from "@/features/data-exports/validation";

function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const dataExportScheduleSchema = z.object({
  enabled: z.boolean(),
  exportFormat: z.enum(EXPORT_FORMATS),
  cadence: z.enum(["daily", "weekly", "monthly"]),
  localTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid delivery time."),
  weekday: z.coerce.number().int().min(0).max(6),
  dayOfMonth: z.coerce.number().int().min(1).max(28),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(isTimezone, "Select a valid timezone."),
});
