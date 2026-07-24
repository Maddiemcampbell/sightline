import { z } from "zod";

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Organization name must be at least 2 characters.")
  .max(160, "Organization name must be 160 characters or fewer.");

export const organizationSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters.")
  .max(80, "Slug must be 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens.",
  );

export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
});

export const updateOrganizationSchema = createOrganizationSchema;

export const createInvitationSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  role: z
    .enum(["administrator", "manager", "contributor"])
    .default("contributor"),
});

export const invitationTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Invitation token is invalid.");
