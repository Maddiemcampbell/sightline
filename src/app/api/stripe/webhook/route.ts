import { sendCustomerOwnerActivation } from "@/features/email/customer-owner-activation";
import { CustomerProvisioningRepository } from "@/features/customer-provisioning/repository";
import { verifyStripeEvent } from "@/features/customer-provisioning/stripe";
import { StripeWebhookService } from "@/features/customer-provisioning/stripe-webhook-service";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = getServerEnv().STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret)
    return Response.json(
      { error: "Webhook is not configured." },
      { status: 400 },
    );
  try {
    const event = verifyStripeEvent(await request.text(), signature, secret);
    const result = await new StripeWebhookService(
      new CustomerProvisioningRepository(createAdminSupabaseClient()),
    ).process(event);
    if (result.activation) {
      try {
        await sendCustomerOwnerActivation({
          requestId: result.activation.request.id,
          companyName: result.activation.request.companyName,
          ownerEmail: result.activation.request.ownerEmail,
          token: result.activation.token,
        });
      } catch (error) {
        // Billing is already verified and durable. Do not ask Stripe to retry
        // a successfully processed financial event because email delivery failed.
        console.error("Stripe activation email delivery failed.", error);
      }
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed.", error);
    return Response.json(
      { error: "Webhook processing failed." },
      { status: 400 },
    );
  }
}
