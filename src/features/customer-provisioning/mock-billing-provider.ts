import "server-only";

import { randomUUID } from "node:crypto";

import type { BillingProvider } from "./types";

export class MockBillingProvider implements BillingProvider {
  readonly name = "mock" as const;

  constructor() {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.SIGHTLINE_E2E !== "true"
    )
      throw new Error("Mock billing is forbidden in production.");
  }

  async approve(input: {
    accessRequestId: string;
    billingEmail: string;
    correlationId: string;
  }) {
    await Promise.resolve();
    const suffix = randomUUID();
    return {
      providerEventId: `mock-event-${suffix}`,
      providerCustomerId: `mock-customer-${input.accessRequestId}`,
      providerSubscriptionId: `mock-subscription-${suffix}`,
      status: "active" as const,
    };
  }
}
