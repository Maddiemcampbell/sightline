import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  APP_URL: z.url(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  INTERNAL_ADMIN_AUTH_USER_IDS: z.string().optional(),
  BILLING_PROVIDER: z.enum(["mock", "stripe"]).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_ID: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    APP_URL: process.env.APP_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    INTERNAL_ADMIN_AUTH_USER_IDS: process.env.INTERNAL_ADMIN_AUTH_USER_IDS,
    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  });
  if (
    parsed.BILLING_PROVIDER === "stripe" &&
    (!parsed.STRIPE_SECRET_KEY ||
      !parsed.STRIPE_WEBHOOK_SECRET ||
      !parsed.STRIPE_PRICE_ID)
  ) {
    throw new Error(
      "Stripe billing requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_ID.",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SIGHTLINE_E2E !== "true" &&
    parsed.BILLING_PROVIDER === "mock"
  ) {
    throw new Error("Mock billing cannot be enabled in production.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SIGHTLINE_E2E !== "true" &&
    new URL(parsed.APP_URL).protocol !== "https:"
  ) {
    throw new Error("APP_URL must use HTTPS in production.");
  }
  return parsed;
}
