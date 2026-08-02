import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getServerEnv } from "@/lib/env";

import {
  createStripeCheckoutSession,
  getStripeSubscriptionPlan,
  verifyStripeEvent,
} from "./stripe";

vi.mock("@/lib/env", () => ({ getServerEnv: vi.fn() }));

const secret = "whsec_test_secret";
const timestamp = 1_700_000_000;
const body = JSON.stringify({
  id: "evt_123",
  type: "checkout.session.completed",
  created: timestamp,
  livemode: false,
  data: { object: { id: "cs_123" } },
});

const stripeEnv = {
  APP_URL: "http://localhost:3000",
  STRIPE_MODE: "test" as const,
  STRIPE_SECRET_KEY: "sk_test_secret",
  STRIPE_ESSENTIAL_PRICE_ID: "price_essential_test",
  STRIPE_PROFESSIONAL_PRICE_ID: "price_professional_test",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(getServerEnv).mockReturnValue(stripeEnv as never);
});

function signature(value = body, time = timestamp) {
  const digest = createHmac("sha256", secret)
    .update(`${time}.${value}`)
    .digest("hex");
  return `t=${time},v1=${digest}`;
}

describe("Stripe webhook verification", () => {
  it("accepts an authentic raw payload within the timestamp tolerance", () => {
    expect(verifyStripeEvent(body, signature(), secret, timestamp).id).toBe(
      "evt_123",
    );
  });

  it("rejects a payload changed after Stripe signed it", () => {
    expect(() =>
      verifyStripeEvent(`${body} `, signature(), secret, timestamp),
    ).toThrow("Invalid Stripe webhook signature");
  });

  it("rejects a correctly signed event outside the replay window", () => {
    expect(() =>
      verifyStripeEvent(body, signature(), secret, timestamp + 301),
    ).toThrow("Invalid Stripe webhook signature");
  });

  it("rejects a signed payload without Stripe's event mode", () => {
    const invalidBody = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.completed",
      created: timestamp,
      data: { object: { id: "cs_123" } },
    });
    expect(() =>
      verifyStripeEvent(invalidBody, signature(invalidBody), secret, timestamp),
    ).toThrow("Invalid Stripe webhook event");
  });
});

describe("Stripe test mode API boundaries", () => {
  it("creates an Essential test Checkout session with test credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/pay/test",
          livemode: false,
        }),
        { status: 200 },
      ),
    );

    await expect(
      createStripeCheckoutSession({
        accessRequestId: "request-123",
        ownerEmail: "owner@example.com",
        companyName: "Acme",
        requestedSlug: "acme",
        correlationId: "correlation-123",
        planKey: "essential",
      }),
    ).resolves.toEqual({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/test",
    });

    const options = fetchMock.mock.calls[0]?.[1];
    expect(options?.headers).toMatchObject({
      Authorization: "Bearer sk_test_secret",
    });
    expect(String(options?.body)).toContain(
      "line_items%5B0%5D%5Bprice%5D=price_essential_test",
    );
  });

  it("rejects a live Checkout response while configured for test mode", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cs_live_123",
          url: "https://checkout.stripe.com/c/pay/live",
          livemode: true,
        }),
        { status: 200 },
      ),
    );

    await expect(
      createStripeCheckoutSession({
        accessRequestId: "request-123",
        ownerEmail: "owner@example.com",
        companyName: "Acme",
        requestedSlug: "acme",
        correlationId: "correlation-123",
        planKey: "professional",
      }),
    ).rejects.toThrow("response mode does not match");
  });

  it("maps a test subscription Price to its plan", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "sub_test_123",
          livemode: false,
          items: { data: [{ price: { id: "price_professional_test" } }] },
        }),
        { status: 200 },
      ),
    );

    await expect(getStripeSubscriptionPlan("sub_test_123")).resolves.toBe(
      "professional",
    );
  });
});
