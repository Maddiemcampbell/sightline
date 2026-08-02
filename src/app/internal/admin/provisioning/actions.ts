"use server";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { CustomerProvisioningRepository } from "@/features/customer-provisioning/repository";
import { CustomerProvisioningService } from "@/features/customer-provisioning/service";
import { approveMockBillingSchema } from "@/features/customer-provisioning/validation";
import { sendCustomerOwnerActivation } from "@/features/email/customer-owner-activation";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type ProvisioningActionState = Readonly<{
  success?: boolean;
  message?: string;
  activationUrl?: string;
  fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export async function approveMockCustomerAction(
  _state: ProvisioningActionState,
  formData: FormData,
): Promise<ProvisioningActionState> {
  const requestId = formData.get("accessRequestId")?.toString() ?? "invalid";
  const operator = await requirePlatformPermission(
    "platform.provisioning.manage",
    "customer_access_request",
    requestId,
  );
  const parsed = approveMockBillingSchema.safeParse({
    accessRequestId: requestId,
    slug: formData.get("slug"),
  });
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const approved = await new CustomerProvisioningService(
      new CustomerProvisioningRepository(createAdminSupabaseClient()),
    ).approveMockBilling(operator, parsed.data);
    const activationUrl = `${getServerEnv().APP_URL}/activate/${approved.token}`;
    let delivered = true;
    try {
      await sendCustomerOwnerActivation({
        requestId: approved.request.id,
        companyName: approved.request.companyName,
        ownerEmail: approved.request.ownerEmail,
        token: approved.token,
      });
    } catch {
      delivered = false;
    }
    await recordPlatformAuditEvent({
      operator,
      action: "platform.customer.mock_billing_approved",
      resourceType: "customer_access_request",
      resourceId: approved.request.id,
      metadata: {
        simulated: true,
        activationDelivery: delivered ? "sent" : "failed",
      },
    });
    return {
      success: true,
      message: delivered
        ? "Simulated subscription activated and Owner invitation sent."
        : "Simulated subscription activated, but email delivery failed. Share the private link securely.",
      activationUrl,
    };
  } catch {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.customer.mock_billing_approved",
      resourceType: "customer_access_request",
      resourceId: requestId,
      outcome: "failed",
      metadata: { reason: "approval_failed", simulated: true },
    });
    return { message: "The simulated approval could not be completed." };
  }
}
