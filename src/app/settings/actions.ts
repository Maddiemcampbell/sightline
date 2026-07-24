"use server";

import { revalidatePath } from "next/cache";

import { sendTestMorningBrief } from "@/features/email/delivery-service";
import { emailPreferencesSchema } from "@/features/email/preferences";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActorContext } from "@/lib/auth/request-context";

export async function updateEmailPreferencesAction(input: {
  enabled: boolean;
  preferredTime: string;
  timezone: string;
}) {
  const context = await requireActorContext();
  const value = emailPreferencesSchema.parse(input);
  const client = await createServerSupabaseClient();
  const { data: user, error } = await client
    .from("users")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!user) throw new Error("User not found");
  const { error: updateError } = await client
    .from("users")
    .update({
      email_delivery_enabled: value.enabled,
      preferred_delivery_time: value.preferredTime,
      delivery_timezone: value.timezone,
    })
    .eq("organization_id", context.organizationId)
    .eq("id", user.id);
  if (updateError) throw new Error(updateError.message);
  revalidatePath("/settings");
}

export async function sendTestEmailAction() {
  try {
    const context = await requireActorContext();
    await sendTestMorningBrief(context.organizationId, context.userId);
    revalidatePath("/settings");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "The test email could not be sent.",
    };
  }
}
