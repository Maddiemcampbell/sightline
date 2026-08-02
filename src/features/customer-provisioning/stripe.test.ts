import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyStripeEvent } from "./stripe";

const secret = "whsec_test_secret";
const timestamp = 1_700_000_000;
const body = JSON.stringify({
  id: "evt_123",
  type: "checkout.session.completed",
  created: timestamp,
  data: { object: { id: "cs_123" } },
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
});
