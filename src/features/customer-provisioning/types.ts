export type AccessRequestStatus =
  | "submitted"
  | "payment_pending"
  | "ready_for_owner"
  | "provisioning"
  | "provisioned"
  | "rejected"
  | "cancelled"
  | "failed";

export type BillingStatus =
  "pending" | "active" | "past_due" | "cancelled" | "payment_failed";

export type CustomerAccessRequest = Readonly<{
  id: string;
  companyName: string;
  requestedSlug: string | null;
  ownerName: string;
  ownerEmail: string;
  companySize: string | null;
  message: string | null;
  status: AccessRequestStatus;
  organizationId: string | null;
  activationExpiresAt: string | null;
  correlationId: string;
  requestedAt: string;
  billingProvider: "mock" | "stripe" | null;
  billingStatus: BillingStatus | null;
  checkoutUrl: string | null;
  checkoutSessionId: string | null;
}>;

export interface BillingProvider {
  readonly name: "mock" | "stripe";
  approve(input: {
    accessRequestId: string;
    billingEmail: string;
    correlationId: string;
  }): Promise<
    Readonly<{
      providerEventId: string;
      providerCustomerId: string;
      providerSubscriptionId: string;
      status: "active";
    }>
  >;
}
