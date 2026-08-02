"use server";

import { z } from "zod";

import { auditIdentifier, recordAuditEvent } from "@/features/audit/service";
import { CustomerProvisioningRepository } from "@/features/customer-provisioning/repository";
import { CustomerProvisioningService } from "@/features/customer-provisioning/service";
import { requestCustomerAccessSchema } from "@/features/customer-provisioning/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type RequestAccessState = Readonly<{
  success?: boolean;
  message?: string;
  fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export async function requestAccessAction(
  _state: RequestAccessState,
  formData: FormData,
): Promise<RequestAccessState> {
  const parsed = requestCustomerAccessSchema.safeParse({
    companyName: formData.get("companyName"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    companySize: formData.get("companySize") || undefined,
    message: formData.get("message") || undefined,
    website: formData.get("website") || undefined,
  });
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const result = await new CustomerProvisioningService(
      new CustomerProvisioningRepository(createAdminSupabaseClient()),
    ).requestAccess(parsed.data);
    await recordAuditEvent({
      organizationId: null,
      actorAuthUserId: null,
      actorUserId: null,
      action: "customer.access_requested",
      resourceType: "customer_access_request",
      resourceId: result.id,
      metadata: {
        ownerIdentifierHash: auditIdentifier(parsed.data.ownerEmail),
      },
    });
  } catch (error) {
    if (!(error instanceof z.ZodError)) {
      // Return the same response for duplicates and new submissions to avoid
      // exposing commercial onboarding state.
      console.error("Customer access request persistence failed.");
    }
  }
  return {
    success: true,
    message:
      "Thanks—your request has been received. We’ll contact you about next steps before creating a workspace.",
  };
}
