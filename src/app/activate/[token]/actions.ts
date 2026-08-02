"use server";

import { redirect } from "next/navigation";

import { recordAuditEvents } from "@/features/audit/service";
import { CustomerProvisioningRepository } from "@/features/customer-provisioning/repository";
import { CustomerProvisioningService } from "@/features/customer-provisioning/service";
import { ownerActivationSchema } from "@/features/customer-provisioning/validation";
import { bootstrapAndSignInTrustedAccount } from "@/lib/auth/trusted-account-bootstrap";
import { setActiveOrganizationCookie } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type ActivationState = Readonly<{
  message?: string;
  fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export async function activateCustomerOwnerAction(
  _state: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  const parsed = ownerActivationSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const service = new CustomerProvisioningService(
    new CustomerProvisioningRepository(createAdminSupabaseClient()),
  );
  const preview = await service.previewActivation(parsed.data.token);
  if (!preview)
    return { message: "This activation is invalid, expired, or unavailable." };

  let completed: Awaited<ReturnType<typeof service.completeOwnerActivation>>;
  let principal: Awaited<ReturnType<typeof bootstrapAndSignInTrustedAccount>>;
  try {
    principal = await bootstrapAndSignInTrustedAccount({
      email: preview.ownerEmail,
      password: parsed.data.password,
      fullName: preview.ownerName,
      accountSource: "customer_owner_activation",
    });
    completed = await service.completeOwnerActivation(
      parsed.data.token,
      principal,
    );
  } catch (error) {
    const knownMessage =
      error instanceof Error && error.message.includes("existing account")
        ? error.message
        : "The workspace could not be activated. Please contact Sightline support.";
    return { message: knownMessage };
  }

  await setActiveOrganizationCookie(completed.organizationId);
  try {
    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_memberships")
      .select("application_user_id")
      .eq("organization_id", completed.organizationId)
      .eq("auth_user_id", principal.id)
      .maybeSingle();
    await recordAuditEvents([
      {
        organizationId: completed.organizationId,
        actorAuthUserId: principal.id,
        actorUserId: membership?.application_user_id ?? null,
        action: "organization.provisioned",
        resourceType: "organization",
        resourceId: completed.organizationId,
        metadata: { source: "approved_customer_activation" },
      },
      {
        organizationId: completed.organizationId,
        actorAuthUserId: principal.id,
        actorUserId: membership?.application_user_id ?? null,
        action: "customer.owner_activated",
        resourceType: "customer_access_request",
        resourceId: preview.id,
        metadata: {},
      },
    ]);
  } catch {
    // Provisioning already committed. Never make the customer retry a
    // consumed activation link because an audit follow-up failed.
    console.error("Owner activation audit follow-up failed.");
  }
  redirect("/projects/new?welcome=organization");
}
