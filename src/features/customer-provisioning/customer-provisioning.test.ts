import { afterEach, describe, expect, it } from "vitest";

import { MockBillingProvider } from "./mock-billing-provider";
import { hashActivationToken } from "./service";
import {
  approveMockBillingSchema,
  ownerActivationSchema,
  requestCustomerAccessSchema,
} from "./validation";

describe("customer provisioning contract", () => {
  afterEach(() => {
    delete process.env.SIGHTLINE_E2E;
  });

  it("normalizes access-request identity without accepting hidden bot input", () => {
    const result = requestCustomerAccessSchema.parse({
      companyName: "  Example Builders  ",
      ownerName: "  Avery Owner ",
      ownerEmail: "AVERY@EXAMPLE.COM",
    });
    expect(result).toMatchObject({
      companyName: "Example Builders",
      ownerName: "Avery Owner",
      ownerEmail: "avery@example.com",
    });
    expect(
      requestCustomerAccessSchema.safeParse({
        companyName: "Example Builders",
        ownerName: "Avery Owner",
        ownerEmail: "avery@example.com",
        website: "bot-filled",
      }).success,
    ).toBe(false);
  });

  it("requires safe slugs and matching strong passwords", () => {
    expect(
      approveMockBillingSchema.safeParse({
        accessRequestId: crypto.randomUUID(),
        slug: "Unsafe Slug!",
      }).success,
    ).toBe(false);
    expect(
      ownerActivationSchema.safeParse({
        token: "a".repeat(64),
        password: "Strong-password-2026!",
        confirmPassword: "different-password",
      }).success,
    ).toBe(false);
  });

  it("stores only a one-way activation token digest", () => {
    const token = "b".repeat(64);
    expect(hashActivationToken(token)).toHaveLength(64);
    expect(hashActivationToken(token)).not.toBe(token);
  });

  it("labels mock billing artifacts as simulated", async () => {
    process.env.SIGHTLINE_E2E = "true";
    const result = await new MockBillingProvider().approve({
      accessRequestId: crypto.randomUUID(),
      billingEmail: "owner@example.com",
      correlationId: crypto.randomUUID(),
    });
    expect(result.providerEventId).toMatch(/^mock-event-/);
    expect(result.providerCustomerId).toMatch(/^mock-customer-/);
    expect(result.status).toBe("active");
  });
});
