import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { Json } from "@/lib/supabase/database.types";
import type {
  AccessRequestStatus,
  BillingStatus,
  CustomerAccessRequest,
} from "./types";

type AccessRow =
  AppDatabase["public"]["Tables"]["customer_access_requests"]["Row"];

export class CustomerProvisioningRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async createAccessRequest(input: {
    companyName: string;
    ownerName: string;
    ownerEmail: string;
    companySize?: string;
    message?: string;
  }) {
    const { data, error } = await this.client
      .from("customer_access_requests")
      .insert({
        company_name: input.companyName,
        owner_name: input.ownerName,
        owner_email: input.ownerEmail,
        company_size: input.companySize ?? null,
        message: input.message || null,
      })
      .select("id,correlation_id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, correlationId: data.correlation_id };
  }

  async list(status: AccessRequestStatus | "all" = "all") {
    let query = this.client
      .from("customer_access_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(100);
    if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return this.attachBilling(data ?? []);
  }

  async get(id: string) {
    const { data, error } = await this.client
      .from("customer_access_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return (await this.attachBilling([data]))[0] ?? null;
  }

  async findActivation(tokenHash: string) {
    const { data, error } = await this.client
      .from("customer_access_requests")
      .select("*")
      .eq("activation_token_hash", tokenHash)
      .is("activation_consumed_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return (await this.attachBilling([data]))[0] ?? null;
  }

  async markMockBillingApproved(input: {
    request: CustomerAccessRequest;
    slug: string;
    tokenHash: string;
    tokenExpiresAt: string;
    operatorId: string;
    providerEventId: string;
    providerCustomerId: string;
    providerSubscriptionId: string;
  }) {
    const { error: billingError } = await this.client
      .from("organization_billing_accounts")
      .upsert(
        {
          access_request_id: input.request.id,
          provider: "mock",
          provider_customer_id: input.providerCustomerId,
          provider_subscription_id: input.providerSubscriptionId,
          status: "active",
          billing_email: input.request.ownerEmail,
        },
        { onConflict: "access_request_id" },
      );
    if (billingError) throw new Error(billingError.message);
    const { error: requestError } = await this.client
      .from("customer_access_requests")
      .update({
        requested_slug: input.slug,
        status: "ready_for_owner",
        activation_token_hash: input.tokenHash,
        activation_expires_at: input.tokenExpiresAt,
        activation_consumed_at: null,
        reviewed_by_operator_id: input.operatorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.request.id)
      .in("status", [
        "submitted",
        "payment_pending",
        "ready_for_owner",
        "failed",
      ])
      .select("id")
      .single();
    if (requestError) throw new Error(requestError.message);
    const { error: eventError } = await this.client
      .from("billing_provider_events")
      .insert({
        provider: "mock",
        provider_event_id: input.providerEventId,
        access_request_id: input.request.id,
        event_type: "subscription.activated",
        processing_status: "processed",
        safe_metadata: { planKey: "design_partner", simulated: true },
        correlation_id: input.request.correlationId,
      });
    if (eventError) throw new Error(eventError.message);
  }

  async markStripeCheckoutPending(input: {
    request: CustomerAccessRequest;
    slug: string;
    checkoutSessionId: string;
    checkoutUrl: string;
    operatorId: string;
  }) {
    const { error: billingError } = await this.client
      .from("organization_billing_accounts")
      .upsert(
        {
          access_request_id: input.request.id,
          provider: "stripe",
          status: "pending",
          billing_email: input.request.ownerEmail,
          provider_checkout_session_id: input.checkoutSessionId,
          checkout_url: input.checkoutUrl,
        },
        { onConflict: "access_request_id" },
      );
    if (billingError) throw new Error(billingError.message);
    const { error: requestError } = await this.client
      .from("customer_access_requests")
      .update({
        requested_slug: input.slug,
        status: "payment_pending",
        reviewed_by_operator_id: input.operatorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.request.id)
      .in("status", ["submitted", "payment_pending", "failed"]);
    if (requestError) throw new Error(requestError.message);
  }

  async claimStripeEvent(input: {
    eventId: string;
    eventType: string;
    accessRequestId: string | null;
    correlationId: string;
    safeMetadata: Json;
  }) {
    const { data, error } = await this.client.rpc(
      "claim_stripe_billing_event",
      {
        supplied_provider_event_id: input.eventId,
        supplied_event_type: input.eventType,
        supplied_access_request_id: input.accessRequestId,
        supplied_correlation_id: input.correlationId,
        supplied_safe_metadata: input.safeMetadata,
      },
    );
    if (error) throw new Error(error.message);
    return data;
  }

  async finishStripeEvent(
    eventId: string,
    status: "processed" | "failed" | "ignored",
  ) {
    const { error } = await this.client
      .from("billing_provider_events")
      .update({ processing_status: status })
      .eq("provider", "stripe")
      .eq("provider_event_id", eventId);
    if (error) throw new Error(error.message);
  }

  async activateStripeBilling(input: {
    accessRequestId: string;
    customerId: string;
    subscriptionId: string;
    tokenHash: string;
    tokenExpiresAt: string;
  }) {
    const { error: billingError } = await this.client
      .from("organization_billing_accounts")
      .update({
        provider_customer_id: input.customerId,
        provider_subscription_id: input.subscriptionId,
        status: "active",
      })
      .eq("access_request_id", input.accessRequestId)
      .eq("provider", "stripe");
    if (billingError) throw new Error(billingError.message);
    const { error: requestError } = await this.client
      .from("customer_access_requests")
      .update({
        status: "ready_for_owner",
        activation_token_hash: input.tokenHash,
        activation_expires_at: input.tokenExpiresAt,
        activation_consumed_at: null,
      })
      .eq("id", input.accessRequestId)
      .eq("status", "payment_pending");
    if (requestError) throw new Error(requestError.message);
  }

  async updateStripeBillingStatus(
    subscriptionId: string,
    status: BillingStatus,
  ) {
    const { error } = await this.client
      .from("organization_billing_accounts")
      .update({ status })
      .eq("provider", "stripe")
      .eq("provider_subscription_id", subscriptionId);
    if (error) throw new Error(error.message);
  }

  async startAttempt(request: CustomerAccessRequest) {
    const { data, error } = await this.client
      .from("customer_provisioning_attempts")
      .insert({
        access_request_id: request.id,
        trigger_source: "owner_activation",
        status: "started",
        correlation_id: request.correlationId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  async finishAttempt(
    id: string,
    status: "succeeded" | "failed",
    failureCode?: string,
  ) {
    const { error } = await this.client
      .from("customer_provisioning_attempts")
      .update({
        status,
        failure_code: failureCode ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async completeActivation(tokenHash: string, authUserId: string) {
    const { data, error } = await this.client.rpc(
      "complete_customer_owner_activation",
      {
        supplied_activation_token_hash: tokenHash,
        principal_auth_user_id: authUserId,
      },
    );
    if (error) throw new Error(error.message);
    return data;
  }

  private async attachBilling(
    rows: AccessRow[],
  ): Promise<CustomerAccessRequest[]> {
    if (!rows.length) return [];
    const { data: billing, error } = await this.client
      .from("organization_billing_accounts")
      .select(
        "access_request_id,provider,status,checkout_url,provider_checkout_session_id",
      )
      .in(
        "access_request_id",
        rows.map((row) => row.id),
      );
    if (error) throw new Error(error.message);
    const byRequest = new Map(
      (billing ?? []).map((item) => [item.access_request_id, item]),
    );
    return rows.map((row) => {
      const account = byRequest.get(row.id);
      return {
        id: row.id,
        companyName: row.company_name,
        requestedSlug: row.requested_slug,
        ownerName: row.owner_name,
        ownerEmail: row.owner_email,
        companySize: row.company_size,
        message: row.message,
        status: row.status as AccessRequestStatus,
        organizationId: row.organization_id,
        activationExpiresAt: row.activation_expires_at,
        correlationId: row.correlation_id,
        requestedAt: row.requested_at,
        billingProvider: account?.provider ?? null,
        billingStatus: (account?.status as BillingStatus | undefined) ?? null,
        checkoutUrl: account?.checkout_url ?? null,
        checkoutSessionId: account?.provider_checkout_session_id ?? null,
      };
    });
  }
}
