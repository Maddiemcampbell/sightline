import "server-only";

import { getServerEnv } from "@/lib/env";
import { MockBillingProvider } from "./mock-billing-provider";
import type { BillingProvider } from "./types";

export function getBillingProvider(): BillingProvider {
  const configured = getBillingProviderName();
  if (configured === "mock") return new MockBillingProvider();
  throw new Error(
    "Stripe approvals are accepted only through verified webhooks.",
  );
}

export function getBillingProviderName() {
  return getServerEnv().BILLING_PROVIDER ?? "mock";
}
