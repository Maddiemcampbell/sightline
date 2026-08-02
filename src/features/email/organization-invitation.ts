import "server-only";

import { createHash } from "node:crypto";

import type { OrganizationRole } from "@/lib/auth/authorization";
import { ResendEmailProvider } from "@/features/email/resend-provider";
import { getServerEnv } from "@/lib/env";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendOrganizationInvitation(input: {
  organizationId: string;
  organizationName: string;
  email: string;
  role: Exclude<OrganizationRole, "owner">;
  token: string;
  invitationId?: string;
}): Promise<void> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error("Transactional email is not configured.");
  }
  const invitationUrl = `${env.APP_URL}/invitations/${input.token}/setup`;
  const message = renderOrganizationInvitation({
    organizationName: input.organizationName,
    role: input.role,
    invitationUrl,
  });
  const tokenFingerprint = createHash("sha256")
    .update(input.token)
    .digest("hex")
    .slice(0, 24);

  await new ResendEmailProvider(env.RESEND_API_KEY).send({
    from: env.EMAIL_FROM,
    to: input.email,
    ...message,
    idempotencyKey: `organization-invitation/${input.organizationId}/${input.invitationId ?? tokenFingerprint}`,
  });
}

export function renderOrganizationInvitation(input: {
  organizationName: string;
  role: Exclude<OrganizationRole, "owner">;
  invitationUrl: string;
}): Readonly<{ subject: string; html: string; text: string }> {
  const organizationNameText = input.organizationName
    .replace(/\s+/g, " ")
    .trim();
  const organizationName = escapeHtml(input.organizationName);
  const role = escapeHtml(input.role[0]!.toUpperCase() + input.role.slice(1));
  const invitationUrl = escapeHtml(input.invitationUrl);
  return {
    subject: `You’re invited to join ${organizationNameText} in Sightline`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#10221d">
      <p style="font-size:13px;font-weight:700;color:#315b49">SIGHTLINE</p>
      <h1 style="font-size:26px;line-height:1.25">Join ${organizationName}</h1>
      <p style="font-size:16px;line-height:1.6">You have been invited as a ${role}. Sign in or create an account using this email address to accept the invitation.</p>
      <p style="margin:28px 0"><a href="${invitationUrl}" style="background:#123f32;color:#fff;padding:13px 18px;border-radius:6px;text-decoration:none;font-weight:700">Accept invitation</a></p>
      <p style="font-size:13px;line-height:1.5;color:#68756f">If you were not expecting this invitation, you can ignore this email. Do not forward the invitation link.</p>
    </div>`,
    text: `You’re invited to join ${organizationNameText} in Sightline as a ${input.role}.\n\nAccept the invitation: ${input.invitationUrl}\n\nSign in or create an account using this email address. If you were not expecting this invitation, ignore this email. Do not forward the invitation link.`,
  };
}
