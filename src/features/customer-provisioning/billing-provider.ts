import "server-only";

import { getServerEnv } from "@/lib/env";
import { MockBillingProvider } from "./mock-billing-provider";
import type { BillingProvider } from "./types";

export function getBillingProvider(): BillingProvider {
  const configured = getServerEnv().BILLING_PROVIDER ?? "mock";
  if (configured === "mock") return new MockBillingProvider();
  throw new Error(
    "Stripe billing is configured but its provider adapter is not implemented yet.",
  );
}
