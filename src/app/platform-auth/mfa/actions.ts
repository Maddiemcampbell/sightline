"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformOperator } from "@/features/platform-admin/authorization";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MfaActionState = Readonly<{
  message?: string;
  enrollment?: Readonly<{
    factorId: string;
    qrCode: string;
    secret: string;
  }>;
}>;

const verifySchema = z.object({
  factorId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the six-digit code from your authenticator app."),
  next: z.string(),
});

export async function beginMfaEnrollmentAction(
  state: MfaActionState,
): Promise<MfaActionState> {
  void state;
  const operator = await requirePlatformOperator({ enforceMfa: false });
  const client = await createServerSupabaseClient();
  const factors = await client.auth.mfa.listFactors();
  if (factors.error)
    return { message: "Authenticator enrollment could not be started." };
  for (const factor of factors.data.all) {
    if (factor.status === "unverified")
      await client.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Sightline Platform Administration",
  });
  if (error)
    return { message: "Authenticator enrollment could not be started." };
  await recordPlatformAuditEvent({
    operator,
    action: "platform.auth.mfa_enrollment_started",
    resourceType: "platform_session",
    resourceId: operator.id,
  });
  return {
    enrollment: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    },
  };
}

export async function verifyPlatformMfaAction(
  _state: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const operator = await requirePlatformOperator({ enforceMfa: false });
  const parsed = verifySchema.safeParse({
    factorId: formData.get("factorId"),
    code: formData.get("code"),
    next: formData.get("next")?.toString() ?? "/internal/admin",
  });
  if (!parsed.success)
    return {
      message: parsed.error.issues[0]?.message ?? "Enter a valid code.",
    };
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });
  if (error) return { message: "That code was not accepted. Try again." };
  await recordPlatformAuditEvent({
    operator,
    action: "platform.auth.mfa_verified",
    resourceType: "platform_session",
    resourceId: operator.id,
  });
  redirect(safeRedirectPath(parsed.data.next, "/internal/admin"));
}
