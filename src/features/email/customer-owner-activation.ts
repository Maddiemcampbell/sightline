import "server-only";

import { ResendEmailProvider } from "@/features/email/resend-provider";
import { getServerEnv } from "@/lib/env";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendCustomerOwnerActivation(input: {
  requestId: string;
  companyName: string;
  ownerEmail: string;
  token: string;
}) {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
    throw new Error("Transactional email is not configured.");
  const url = `${env.APP_URL}/activate/${input.token}`;
  const company = escapeHtml(input.companyName);
  const safeUrl = escapeHtml(url);
  await new ResendEmailProvider(env.RESEND_API_KEY).send({
    from: env.EMAIL_FROM,
    to: input.ownerEmail,
    subject: `Set up ${input.companyName} in Sightline`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#10221d">
      <p style="font-size:13px;font-weight:700;color:#315b49">SIGHTLINE</p>
      <h1 style="font-size:26px;line-height:1.25">Set up ${company}</h1>
      <p style="font-size:16px;line-height:1.6">Your organization is approved. Use this private, single-use link to establish the first Owner account.</p>
      <p style="margin:28px 0"><a href="${safeUrl}" style="background:#173f32;color:#fff;padding:13px 18px;border-radius:6px;text-decoration:none;font-weight:700">Set up workspace</a></p>
      <p style="font-size:13px;line-height:1.5;color:#68756f">This link expires in seven days. Do not forward it.</p>
    </div>`,
    text: `Your Sightline organization ${input.companyName} is approved. Set up its Owner account: ${url}\n\nThis private link expires in seven days. Do not forward it.`,
    idempotencyKey: `customer-owner-activation/${input.requestId}/${input.token.slice(0, 16)}`,
  });
}
