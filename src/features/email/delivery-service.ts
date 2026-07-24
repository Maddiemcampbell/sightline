import "server-only";

import {
  getDailyBriefView,
  getDailyBriefViewForOrganization,
} from "@/features/daily-brief/data";
import {
  isBriefDeliveryDue,
  scheduledDeliveryKey,
} from "@/features/email/delivery-time";
import type { EmailProvider } from "@/features/email/provider";
import { EmailProviderError } from "@/features/email/provider";
import { renderMorningBriefEmail } from "@/features/email/render-morning-brief";
import { ResendEmailProvider } from "@/features/email/resend-provider";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { runOrganizationJobsSequentially } from "@/lib/tenancy/organization-jobs";

export type DeliverySummary = { sent: number; skipped: number; failed: number };

export async function deliverScheduledMorningBriefs(
  now = new Date(),
): Promise<DeliverySummary> {
  const client = createAdminSupabaseClient();
  const provider = configuredEmailProvider();
  const config = emailConfig();
  const summary: DeliverySummary = { sent: 0, skipped: 0, failed: 0 };
  const { data: organizations, error: organizationsError } = await client
    .from("organizations")
    .select("id,name");
  if (organizationsError) throw new Error(organizationsError.message);
  await runOrganizationJobsSequentially(
    (organizations ?? []).map((organization) => ({
      organizationId: organization.id,
      name: organization.name,
    })),
    async (organization) => {
      const organizationId = organization.organizationId;
      const brief = await getDailyBriefViewForOrganization(organizationId);
      if (!brief || brief.risks.length !== 3) return;
      const { data: users, error: usersError } = await client
        .from("users")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("email_delivery_enabled", true);
      if (usersError) throw new Error(usersError.message);
      for (const user of users ?? []) {
        if (
          !isBriefDeliveryDue({
            now,
            timezone: user.delivery_timezone,
            preferredTime: user.preferred_delivery_time.slice(0, 5),
            briefDate: brief.briefDate,
          })
        ) {
          summary.skipped += 1;
          continue;
        }
        const outcome = await sendBriefEmail({
          organizationId,
          provider,
          organizationName: organization.name,
          user,
          brief,
          appUrl: config.appUrl,
          from: config.from,
          kind: "scheduled",
          now,
        });
        summary[outcome] += 1;
      }
    },
  );
  return summary;
}

export async function sendTestMorningBrief(
  organizationId: string,
  userId: string,
) {
  const client = createAdminSupabaseClient();
  const brief = await getDailyBriefViewForOrganization(organizationId);
  if (!brief || brief.risks.length !== 3)
    throw new Error("A complete Daily Brief is required.");
  const [organizationResult, userResult] = await Promise.all([
    client
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single(),
    client
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", userId)
      .single(),
  ]);
  if (organizationResult.error)
    throw new Error(organizationResult.error.message);
  if (userResult.error) throw new Error(userResult.error.message);
  const config = emailConfig();
  const outcome = await sendBriefEmail({
    organizationId,
    provider: configuredEmailProvider(),
    organizationName: organizationResult.data.name,
    user: userResult.data,
    brief,
    appUrl: config.appUrl,
    from: config.from,
    kind: "test",
    now: new Date(),
  });
  if (outcome !== "sent") throw new Error("Test email failed.");
}

async function sendBriefEmail(input: {
  organizationId: string;
  provider: EmailProvider;
  organizationName: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  brief: NonNullable<Awaited<ReturnType<typeof getDailyBriefView>>>;
  appUrl: string;
  from: string;
  kind: "scheduled" | "test";
  now: Date;
}): Promise<"sent" | "skipped" | "failed"> {
  const { organizationId } = input;
  const client = createAdminSupabaseClient();
  const idempotencyKey =
    input.kind === "scheduled"
      ? scheduledDeliveryKey(input.brief.briefId, input.user.id)
      : `morning-brief-test/${input.brief.briefId}/${input.user.id}/${crypto.randomUUID()}`;
  let delivery = await client
    .from("daily_brief_deliveries")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (delivery.error) throw new Error(delivery.error.message);
  if (!delivery.data) {
    const inserted = await client
      .from("daily_brief_deliveries")
      .insert({
        organization_id: organizationId,
        daily_brief_id: input.brief.briefId,
        user_id: input.user.id,
        delivery_kind: input.kind,
        provider: input.provider.name,
        idempotency_key: idempotencyKey,
        recipient_email: input.user.email,
        status: "pending",
      })
      .select("*")
      .single();
    if (inserted.error) {
      if (input.kind !== "scheduled") throw new Error(inserted.error.message);
      delivery = await client
        .from("daily_brief_deliveries")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("daily_brief_id", input.brief.briefId)
        .eq("user_id", input.user.id)
        .eq("delivery_kind", "scheduled")
        .single();
      if (delivery.error) throw new Error(delivery.error.message);
    } else delivery = inserted;
  }
  const row = delivery.data;
  if (!row) throw new Error("Delivery record missing.");
  if (row.organization_id !== organizationId)
    throw new Error("Delivery organization mismatch.");
  if (row.status === "sent") return "skipped";
  if (row.attempt_count >= 3) return "failed";
  if (row.next_retry_at && new Date(row.next_retry_at) > input.now)
    return "skipped";

  const attempt = row.attempt_count + 1;
  const { error: claimError } = await client
    .from("daily_brief_deliveries")
    .update({
      status: "sending",
      attempt_count: attempt,
      last_attempt_at: input.now.toISOString(),
      error_message: null,
    })
    .eq("id", row.id)
    .eq("organization_id", organizationId);
  if (claimError) throw new Error(claimError.message);

  const email = renderMorningBriefEmail({
    organizationName: input.organizationName,
    recipientName: input.user.full_name,
    brief: input.brief,
    appUrl: input.appUrl,
  });
  try {
    const result = await input.provider.send({
      from: input.from,
      to: input.user.email,
      ...email,
      idempotencyKey,
    });
    const { error } = await client
      .from("daily_brief_deliveries")
      .update({
        status: "sent",
        provider_message_id: result.providerMessageId,
        sent_at: new Date().toISOString(),
        next_retry_at: null,
      })
      .eq("id", row.id)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
    return "sent";
  } catch (error) {
    const retryable =
      error instanceof EmailProviderError ? error.retryable : true;
    const nextRetryAt =
      retryable && attempt < 3
        ? new Date(input.now.getTime() + 15 * 60_000 * attempt).toISOString()
        : null;
    await client
      .from("daily_brief_deliveries")
      .update({
        status: "failed",
        error_message:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Unknown provider error",
        next_retry_at: nextRetryAt,
      })
      .eq("id", row.id)
      .eq("organization_id", organizationId);
    if (input.kind === "test") {
      throw error;
    }
    return "failed";
  }
}

function configuredEmailProvider(): EmailProvider {
  const apiKey = getServerEnv().RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  return new ResendEmailProvider(apiKey);
}

function emailConfig(): { appUrl: string; from: string } {
  const env = getServerEnv();
  if (!env.EMAIL_FROM || !env.APP_URL) {
    throw new Error("EMAIL_FROM and APP_URL must be configured.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    new URL(env.APP_URL).protocol !== "https:"
  ) {
    throw new Error("APP_URL must use HTTPS in production.");
  }
  return { appUrl: env.APP_URL, from: env.EMAIL_FROM };
}
