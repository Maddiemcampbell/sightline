import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";

const STRIPE_API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

export type StripeEvent = Readonly<{
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}>;

export async function createStripeCheckoutSession(input: {
  accessRequestId: string;
  ownerEmail: string;
  companyName: string;
  requestedSlug: string;
  correlationId: string;
}) {
  const env = getServerEnv();
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID)
    throw new Error("Stripe Checkout is not configured.");
  const body = new URLSearchParams({
    mode: "subscription",
    customer_email: input.ownerEmail,
    client_reference_id: input.accessRequestId,
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    success_url: `${env.APP_URL}/internal/admin/provisioning?checkout=success`,
    cancel_url: `${env.APP_URL}/internal/admin/provisioning?checkout=cancelled`,
    "metadata[access_request_id]": input.accessRequestId,
    "metadata[correlation_id]": input.correlationId,
    "metadata[requested_slug]": input.requestedSlug,
    "metadata[company_name]": input.companyName.slice(0, 500),
    "subscription_data[metadata][access_request_id]": input.accessRequestId,
    "subscription_data[metadata][correlation_id]": input.correlationId,
  });
  const response = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `access-request-${input.accessRequestId}-checkout`,
    },
    body,
    cache: "no-store",
  });
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof (result.error as Record<string, unknown> | undefined)?.message ===
        "string"
        ? String((result.error as Record<string, unknown>).message)
        : "Stripe Checkout session creation failed.",
    );
  if (typeof result.id !== "string" || typeof result.url !== "string")
    throw new Error("Stripe returned an invalid Checkout session.");
  return { id: result.id, url: result.url };
}

export function verifyStripeEvent(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): StripeEvent {
  const parts = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
  const signatures = parts
    .filter(([key]) => key === "v1")
    .map(([, value]) => value)
    .filter((value): value is string => Boolean(value));
  if (
    !Number.isInteger(timestamp) ||
    Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS ||
    signatures.length === 0
  )
    throw new Error("Invalid Stripe webhook signature.");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBytes = Buffer.from(expected, "hex");
  const verified = signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const actualBytes = Buffer.from(signature, "hex");
    return (
      actualBytes.length === expectedBytes.length &&
      timingSafeEqual(actualBytes, expectedBytes)
    );
  });
  if (!verified) throw new Error("Invalid Stripe webhook signature.");
  const event = JSON.parse(rawBody) as Partial<StripeEvent>;
  if (
    typeof event.id !== "string" ||
    typeof event.type !== "string" ||
    typeof event.created !== "number" ||
    !event.data ||
    !event.data.object ||
    typeof event.data.object !== "object"
  )
    throw new Error("Invalid Stripe webhook event.");
  return event as StripeEvent;
}
