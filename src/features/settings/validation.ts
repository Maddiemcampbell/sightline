import { z } from "zod";
import { isValidTimezone } from "@/features/email/delivery-time";

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120),
});

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  logoUrl: z.union([z.literal(""), z.url().max(2048)]),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  timezone: z.string().refine(isValidTimezone, "Choose a valid timezone."),
  defaultCurrency: z.string().regex(/^[A-Z]{3}$/),
  industry: z.string().trim().max(120),
  companySize: z.enum([
    "",
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1001+",
  ]),
});

export const notificationSettingsSchema = z.object({
  digestFrequency: z.enum(["off", "daily", "weekly"]),
  assignmentNotifications: z.boolean(),
  mentionNotifications: z.boolean(),
  weeklySummary: z.boolean(),
});

export const organizationNotificationDefaultsSchema = z.object({
  digest: z.enum(["off", "daily", "weekly"]),
  assignment: z.boolean(),
  mention: z.boolean(),
  weeklySummary: z.boolean(),
});

export const projectDefaultsSchema = z.object({
  visibility: z.enum(["private", "organization"]),
  role: z.enum(["manager", "contributor", "viewer"]),
  documentPermissions: z.enum(["project_members", "managers", "organization"]),
});

export const passwordUpdateSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
