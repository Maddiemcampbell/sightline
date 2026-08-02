import { describe, expect, it, vi } from "vitest";

import { getServerEnv } from "@/lib/env";

import type { CustomerProvisioningRepository } from "./repository";
import { getStripeSubscriptionPlan } from "./stripe";
import { StripeWebhookService } from "./stripe-webhook-service";
import type { StripeEvent } from "./stripe";
import type { CustomerAccessRequest } from "./types";

vi.mock("./stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe")>()),
  getStripeSubscriptionPlan: vi.fn().mockResolvedValue("essential"),
}));
vi.mock("@/lib/env", () => ({
  getServerEnv: vi.fn(() => ({ STRIPE_MODE: "test" })),
}));

const request: CustomerAccessRequest = {
  id: "00000000-0000-0000-0000-000000000001",
  companyName: "Acme Construction",
  requestedSlug: "acme-construction",
  ownerName: "Alex Owner",
  ownerEmail: "alex@example.com",
  companySize: null,
  message: null,
  status: "payment_pending",
  organizationId: null,
  activationExpiresAt: null,
  correlationId: "00000000-0000-0000-0000-000000000002",
  requestedAt: "2026-08-01T00:00:00.000Z",
  billingProvider: "stripe",
  billingStatus: "pending",
  checkoutUrl: "https://checkout.stripe.com/c/pay/test",
  checkoutSessionId: "cs_test",
};

function checkoutEvent(paymentStatus = "paid"): StripeEvent {
  return {
    id: "evt_checkout",
    type: "checkout.session.completed",
    created: 1_700_000_000,
    livemode: false,
    data: {
      object: {
        id: "cs_test",
        mode: "subscription",
        status: "complete",
        payment_status: paymentStatus,
        customer: "cus_test",
        subscription: "sub_test",
        metadata: {
          access_request_id: request.id,
          correlation_id: request.correlationId,
        },
      },
    },
  };
}

function repository(claimed = true) {
  return {
    get: vi.fn().mockResolvedValue(request),
    claimStripeEvent: vi.fn().mockResolvedValue(claimed),
    activateStripeBilling: vi.fn().mockResolvedValue(undefined),
    updateStripeBillingStatus: vi.fn().mockResolvedValue(undefined),
    finishStripeEvent: vi.fn().mockResolvedValue(undefined),
  };
}

describe("Stripe webhook processing", () => {
  it("activates billing only from a paid completed Checkout event", async () => {
    const fake = repository();
    const result = await new StripeWebhookService(
      fake as unknown as CustomerProvisioningRepository,
    ).process(checkoutEvent());

    expect(fake.activateStripeBilling).toHaveBeenCalledWith(
      expect.objectContaining({
        accessRequestId: request.id,
        customerId: "cus_test",
        subscriptionId: "sub_test",
        planKey: "essential",
      }),
    );
    expect(result.activation?.request.id).toBe(request.id);
    expect(getStripeSubscriptionPlan).toHaveBeenCalledWith("sub_test");
    expect(result.activation?.token).toMatch(/^[a-f0-9]{64}$/);
    expect(fake.finishStripeEvent).toHaveBeenCalledWith(
      "evt_checkout",
      "processed",
    );
  });

  it("does not repeat side effects when the event ID is already claimed", async () => {
    const fake = repository(false);
    await new StripeWebhookService(
      fake as unknown as CustomerProvisioningRepository,
    ).process(checkoutEvent());

    expect(fake.activateStripeBilling).not.toHaveBeenCalled();
    expect(fake.finishStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects an unpaid Checkout event and records failed processing", async () => {
    const fake = repository();
    await expect(
      new StripeWebhookService(
        fake as unknown as CustomerProvisioningRepository,
      ).process(checkoutEvent("unpaid")),
    ).rejects.toThrow("payment is not complete");

    expect(fake.activateStripeBilling).not.toHaveBeenCalled();
    expect(fake.finishStripeEvent).toHaveBeenCalledWith(
      "evt_checkout",
      "failed",
    );
  });

  it("rejects live events in test mode before claiming them", async () => {
    vi.mocked(getServerEnv).mockReturnValue({ STRIPE_MODE: "test" } as never);
    const fake = repository();

    await expect(
      new StripeWebhookService(
        fake as unknown as CustomerProvisioningRepository,
      ).process({ ...checkoutEvent(), livemode: true }),
    ).rejects.toThrow("response mode does not match");

    expect(fake.claimStripeEvent).not.toHaveBeenCalled();
    expect(fake.activateStripeBilling).not.toHaveBeenCalled();
  });
});
