import { afterEach, describe, expect, it, vi } from "vitest";

import { getServerEnv } from "./env";

function setRequiredEnvironment() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("CRON_SECRET", "a".repeat(32));
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("BILLING_PROVIDER", "stripe");
  vi.stubEnv("STRIPE_MODE", "test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_secret");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_secret");
  vi.stubEnv("STRIPE_ESSENTIAL_PRICE_ID", "price_essential_test");
  vi.stubEnv("STRIPE_PROFESSIONAL_PRICE_ID", "price_professional_test");
}

afterEach(() => vi.unstubAllEnvs());

describe("Stripe environment contract", () => {
  it("accepts a complete test-mode configuration", () => {
    setRequiredEnvironment();

    expect(getServerEnv()).toMatchObject({
      STRIPE_MODE: "test",
      STRIPE_SECRET_KEY: "sk_test_secret",
    });
  });

  it("rejects a live secret key in test mode", () => {
    setRequiredEnvironment();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_secret");

    expect(() => getServerEnv()).toThrow(
      "STRIPE_SECRET_KEY must be a Stripe test mode secret key",
    );
  });

  it("requires an explicit Stripe mode", () => {
    setRequiredEnvironment();
    vi.stubEnv("STRIPE_MODE", "");

    expect(() => getServerEnv()).toThrow("STRIPE_MODE");
  });
});
