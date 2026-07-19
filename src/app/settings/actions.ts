"use server";

import { revalidatePath } from "next/cache";

import {
  BUILDCO_ORGANIZATION_ID,
  MATT_USER_ID,
} from "@/features/daily-brief/data";
import { sendTestMorningBrief } from "@/features/email/delivery-service";
import { emailPreferencesSchema } from "@/features/email/preferences";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function updateEmailPreferencesAction(input: {
  enabled: boolean;
  preferredTime: string;
  timezone: string;
}) {
  const value = emailPreferencesSchema.parse(input);
  const client = createAdminSupabaseClient();
  const { data: user, error } = await client
    .from("users")
    .select("id")
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", MATT_USER_ID)
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
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", user.id);
  if (updateError) throw new Error(updateError.message);
  revalidatePath("/settings");
}

export async function sendTestEmailAction() {
  try {
    await sendTestMorningBrief(MATT_USER_ID);
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
