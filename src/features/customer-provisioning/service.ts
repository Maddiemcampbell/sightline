import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { PlatformOperator } from "@/features/platform-admin/types";
import type { RequestPrincipal } from "@/lib/auth/session";
import { getBillingProvider, getBillingProviderName } from "./billing-provider";
import { CustomerProvisioningRepository } from "./repository";
import { createStripeCheckoutSession } from "./stripe";
import {
  approveMockBillingSchema,
  requestCustomerAccessSchema,
  startStripeCheckoutSchema,
} from "./validation";

const ACTIVATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export class CustomerProvisioningService {
  constructor(private readonly repository: CustomerProvisioningRepository) {}

  requestAccess(input: unknown) {
    const value = requestCustomerAccessSchema.parse(input);
    return this.repository.createAccessRequest({
      companyName: value.companyName,
      ownerName: value.ownerName,
      ownerEmail: value.ownerEmail,
      ...(value.companySize ? { companySize: value.companySize } : {}),
      ...(value.message ? { message: value.message } : {}),
    });
  }

  async startStripeCheckout(operator: PlatformOperator, input: unknown) {
    const value = startStripeCheckoutSchema.parse(input);
    const request = await this.repository.get(value.accessRequestId);
    if (
      !request ||
      !["submitted", "payment_pending", "failed"].includes(request.status)
    )
      throw new Error("Access request is unavailable.");
    if (getBillingProviderName() !== "stripe")
      throw new Error("Stripe billing is not configured.");
    const session = await createStripeCheckoutSession({
      accessRequestId: request.id,
      ownerEmail: request.ownerEmail,
      companyName: request.companyName,
      requestedSlug: value.slug,
      correlationId: request.correlationId,
    });
    await this.repository.markStripeCheckoutPending({
      request,
      slug: value.slug,
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      operatorId: operator.id,
    });
    return { request, checkoutUrl: session.url };
  }

  list(status?: Parameters<CustomerProvisioningRepository["list"]>[0]) {
    return this.repository.list(status);
  }

  get(id: string) {
    return this.repository.get(id);
  }

  async approveMockBilling(operator: PlatformOperator, input: unknown) {
    const value = approveMockBillingSchema.parse(input);
    const request = await this.repository.get(value.accessRequestId);
    if (
      !request ||
      !["submitted", "payment_pending", "ready_for_owner", "failed"].includes(
        request.status,
      )
    )
      throw new Error("Access request is unavailable.");
    const provider = getBillingProvider();
    if (provider.name !== "mock")
      throw new Error("Simulated approval requires the mock billing provider.");
    const approval = await provider.approve({
      accessRequestId: request.id,
      billingEmail: request.ownerEmail,
      correlationId: request.correlationId,
    });
    const token = randomBytes(32).toString("hex");
    await this.repository.markMockBillingApproved({
      request,
      slug: value.slug,
      tokenHash: hashActivationToken(token),
      tokenExpiresAt: new Date(
        Date.now() + ACTIVATION_LIFETIME_MS,
      ).toISOString(),
      operatorId: operator.id,
      providerEventId: approval.providerEventId,
      providerCustomerId: approval.providerCustomerId,
      providerSubscriptionId: approval.providerSubscriptionId,
    });
    return { request, token };
  }

  async previewActivation(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const request = await this.repository.findActivation(
      hashActivationToken(token),
    );
    if (
      !request ||
      request.status !== "ready_for_owner" ||
      request.billingStatus !== "active" ||
      !request.activationExpiresAt ||
      new Date(request.activationExpiresAt) <= new Date()
    )
      return null;
    return request;
  }

  async completeOwnerActivation(token: string, principal: RequestPrincipal) {
    const request = await this.previewActivation(token);
    if (!request || request.ownerEmail !== principal.email.toLowerCase())
      throw new Error("Activation is unavailable.");
    const attemptId = await this.repository.startAttempt(request);
    try {
      const organizationId = await this.repository.completeActivation(
        hashActivationToken(token),
        principal.id,
      );
      await this.repository.finishAttempt(attemptId, "succeeded");
      return { organizationId, request };
    } catch (error) {
      await this.repository.finishAttempt(
        attemptId,
        "failed",
        "activation_failed",
      );
      throw error;
    }
  }
}
