import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { CustomerProvisioningRepository } from "./repository";
import { hashActivationToken } from "./service";
import type { BillingStatus, CustomerAccessRequest } from "./types";
import type { StripeEvent } from "./stripe";

const ACTIVATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

type Activation = { request: CustomerAccessRequest; token: string };

export class StripeWebhookService {
  constructor(private readonly repository: CustomerProvisioningRepository) {}

  async process(event: StripeEvent): Promise<{ activation?: Activation }> {
    const object = event.data.object;
    const metadata = readMetadata(object.metadata);
    const accessRequestId = metadata.access_request_id ?? null;
    const request = accessRequestId
      ? await this.repository.get(accessRequestId)
      : null;
    const correlationId =
      request?.correlationId ?? metadata.correlation_id ?? randomUUID();
    const claimed = await this.repository.claimStripeEvent({
      eventId: event.id,
      eventType: event.type,
      accessRequestId: request?.id ?? null,
      correlationId,
      safeMetadata: {
        stripeCreated: event.created,
        objectId: stringValue(object.id),
        livemode: object.livemode === true,
      },
    });
    if (!claimed) return {};
    try {
      const activation = await this.applyEvent(event, request);
      await this.repository.finishStripeEvent(
        event.id,
        isSupportedEvent(event.type) ? "processed" : "ignored",
      );
      return activation ? { activation } : {};
    } catch (error) {
      await this.repository.finishStripeEvent(event.id, "failed");
      throw error;
    }
  }

  private async applyEvent(
    event: StripeEvent,
    request: CustomerAccessRequest | null,
  ): Promise<Activation | undefined> {
    const object = event.data.object;
    if (event.type === "checkout.session.completed") {
      if (!request || request.status !== "payment_pending")
        throw new Error("Stripe Checkout event has no pending access request.");
      if (
        !request.checkoutSessionId ||
        stringValue(object.id) !== request.checkoutSessionId
      )
        throw new Error(
          "Stripe Checkout session does not match the access request.",
        );
      if (object.mode !== "subscription" || object.status !== "complete")
        throw new Error("Stripe Checkout session is not complete.");
      if (
        object.payment_status !== "paid" &&
        object.payment_status !== "no_payment_required"
      )
        throw new Error("Stripe Checkout payment is not complete.");
      const customerId = stringValue(object.customer);
      const subscriptionId = stringValue(object.subscription);
      if (!customerId || !subscriptionId)
        throw new Error(
          "Stripe Checkout event is missing billing identifiers.",
        );
      const token = randomBytes(32).toString("hex");
      await this.repository.activateStripeBilling({
        accessRequestId: request.id,
        customerId,
        subscriptionId,
        tokenHash: hashActivationToken(token),
        tokenExpiresAt: new Date(
          Date.now() + ACTIVATION_LIFETIME_MS,
        ).toISOString(),
      });
      return { request, token };
    }
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscriptionId = stringValue(object.id);
      if (!subscriptionId) throw new Error("Subscription event has no ID.");
      await this.repository.updateStripeBillingStatus(
        subscriptionId,
        mapSubscriptionStatus(String(object.status ?? "")),
      );
    }
    return undefined;
  }
}

function readMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function isSupportedEvent(type: string) {
  return [
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ].includes(type);
}

function mapSubscriptionStatus(status: string): BillingStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "paused") return "cancelled";
  return "pending";
}
