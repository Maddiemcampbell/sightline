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
  STRIPE_MODE: z.enum(["test", "live"]).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_ESSENTIAL_PRICE_ID: z.string().min(1).optional(),
  STRIPE_PROFESSIONAL_PRICE_ID: z.string().min(1).optional(),
  PROCORE_API_ENVIRONMENT: z.enum(["sandbox", "production"]).optional(),
  PROCORE_SANDBOX_APP_VERSION_KEY: z.string().min(1).optional(),
  PROCORE_CLIENT_ID: z.string().min(1).optional(),
  PROCORE_CLIENT_SECRET: z.string().min(1).optional(),
  PROCORE_CREDENTIAL_ENCRYPTION_KEY: z.string().min(32).optional(),
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
    STRIPE_MODE: process.env.STRIPE_MODE,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_ESSENTIAL_PRICE_ID: process.env.STRIPE_ESSENTIAL_PRICE_ID,
    STRIPE_PROFESSIONAL_PRICE_ID: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    PROCORE_API_ENVIRONMENT: process.env.PROCORE_API_ENVIRONMENT,
    PROCORE_SANDBOX_APP_VERSION_KEY:
      process.env.PROCORE_SANDBOX_APP_VERSION_KEY,
    PROCORE_CLIENT_ID: process.env.PROCORE_CLIENT_ID,
    PROCORE_CLIENT_SECRET: process.env.PROCORE_CLIENT_SECRET,
    PROCORE_CREDENTIAL_ENCRYPTION_KEY:
      process.env.PROCORE_CREDENTIAL_ENCRYPTION_KEY,
  });
  if (
    parsed.BILLING_PROVIDER === "stripe" &&
    (!parsed.STRIPE_MODE ||
      !parsed.STRIPE_SECRET_KEY ||
      !parsed.STRIPE_WEBHOOK_SECRET ||
      !parsed.STRIPE_ESSENTIAL_PRICE_ID ||
      !parsed.STRIPE_PROFESSIONAL_PRICE_ID)
  ) {
    throw new Error(
      "Stripe billing requires a mode, secret, webhook secret, and both launch-plan Price IDs.",
    );
  }
  if (
    parsed.BILLING_PROVIDER === "stripe" &&
    parsed.STRIPE_MODE &&
    parsed.STRIPE_SECRET_KEY &&
    !parsed.STRIPE_SECRET_KEY.startsWith(`sk_${parsed.STRIPE_MODE}_`)
  ) {
    throw new Error(
      `STRIPE_SECRET_KEY must be a Stripe ${parsed.STRIPE_MODE} mode secret key.`,
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
