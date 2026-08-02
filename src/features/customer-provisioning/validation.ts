import { z } from "zod";

export const requestCustomerAccessSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.email().trim().toLowerCase().max(320),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501+"])
    .optional(),
  message: z.string().trim().max(2000).optional(),
  website: z.string().max(0).optional(),
});

export const approveMockBillingSchema = z.object({
  accessRequestId: z.uuid(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const startStripeCheckoutSchema = approveMockBillingSchema;

export const ownerActivationSchema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    password: z.string().min(12).max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
