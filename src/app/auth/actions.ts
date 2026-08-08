"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeRedirectPath } from "@/lib/auth/redirects";
import { resolveOnboardingDestination } from "@/lib/auth/onboarding";
import {
  getCurrentUser,
  setActiveOrganizationCookie,
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  auditIdentifier,
  recordAuditEvent,
  recordPrincipalAuditEvent,
} from "@/features/audit/service";
import { getServerEnv } from "@/lib/env";
import { recordPlatformAuthenticationEvent } from "@/features/platform-admin/audit";
import { reportError } from "@/features/observability/service";

export type AuthActionState = Readonly<{
  error?: boolean;
  message?: string;
  fieldErrors?: Readonly<{
    email?: readonly string[];
    password?: readonly string[];
    confirmPassword?: readonly string[];
  }>;
}>;

async function completeAuthentication(
  next: string | null | undefined,
  welcome?: "signup",
): Promise<never> {
  const principal = await getCurrentUser();
  if (!principal) redirect("/login?error=invalid_session");
  const resolution = await resolveOnboardingDestination(principal, {
    ...(next === undefined ? {} : { next }),
    ...(welcome === undefined ? {} : { welcome }),
  });
  if (resolution.organizationId) {
    await setActiveOrganizationCookie(resolution.organizationId);
  }
  redirect(resolution.destination);
}

const emailSchema = z.email("Enter a valid email address.").trim();
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password must be 128 characters or fewer.");

function siteUrl(): string {
  return getServerEnv().APP_URL;
}

function validationState(error: z.ZodError): AuthActionState {
  return { fieldErrors: error.flatten().fieldErrors };
}

export async function login(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({
      email: emailSchema,
      password: z.string().min(1, "Enter your password."),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) return validationState(parsed.error);

  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword(parsed.data);
  if (error) {
    await recordAuthenticationSideEffect(() =>
      recordAuditEvent({
        organizationId: null,
        actorAuthUserId: null,
        actorUserId: null,
        action: "auth.login",
        resourceType: "session",
        outcome: "failed",
        metadata: { identifierHash: auditIdentifier(parsed.data.email) },
      }),
    );
    return { message: "Email or password is incorrect." };
  }
  await recordAuthenticationSideEffect(() =>
    recordPrincipalAuditEvent({
      actorAuthUserId: data.user.id,
      action: "auth.login",
      resourceType: "session",
      metadata: { authenticationMethod: "password" },
    }),
  );
  await recordAuthenticationSideEffect(() =>
    recordPlatformAuthenticationEvent(data.user.id, "platform.auth.login"),
  );

  return completeAuthentication(
    safeRedirectPath(formData.get("next")?.toString()),
  );
}

async function recordAuthenticationSideEffect(
  operation: () => Promise<void>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    await reportError({
      error,
      source: "server",
      requestPath: "/login",
      requestMethod: "POST",
      metadata: { operation: "authentication_audit" },
    });
  }
}

export async function signup(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void _state;
  void formData;
  return {
    message:
      "Account creation is invite-only. Request access or use the private setup link in your invitation email.",
  };
}

export async function resendVerificationEmail(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      fieldErrors: { email: parsed.error.issues.map((issue) => issue.message) },
    };
  }
  const next = safeRedirectPath(formData.get("next")?.toString(), "/");
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.resend({
    type: "signup",
    email: parsed.data,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return {
      error: true,
      message:
        "A new verification email could not be sent yet. Wait a moment and try again.",
    };
  }
  return {
    message:
      "If this address has a pending account, a new verification link is on its way.",
  };
}

export async function requestPasswordReset(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      fieldErrors: { email: parsed.error.issues.map((issue) => issue.message) },
    };
  }

  const client = await createServerSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return { message: "We could not send a reset email. Try again." };
  await recordAuditEvent({
    organizationId: null,
    actorAuthUserId: null,
    actorUserId: null,
    action: "auth.password_reset_requested",
    resourceType: "account",
    metadata: { identifierHash: auditIdentifier(parsed.data) },
  });

  return {
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function updatePassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    })
    .safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
  if (!parsed.success) return validationState(parsed.error);

  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      message:
        "This reset link is invalid or expired. Request a new password reset.",
    };
  }
  await recordPrincipalAuditEvent({
    actorAuthUserId: data.user.id,
    action: "auth.password_reset_completed",
    resourceType: "account",
  });

  redirect("/login?reset=success");
}

export async function logout(formData?: FormData): Promise<void> {
  const client = await createServerSupabaseClient();
  const { data } = await client.auth.getUser();
  if (data.user) {
    await recordPrincipalAuditEvent({
      actorAuthUserId: data.user.id,
      action: "auth.logout",
      resourceType: "session",
    });
    await recordPlatformAuthenticationEvent(
      data.user.id,
      "platform.auth.logout",
    );
  }
  await client.auth.signOut();
  const next = safeRedirectPath(formData?.get("next")?.toString(), "");
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
