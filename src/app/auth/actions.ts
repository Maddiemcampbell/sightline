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
    await recordAuditEvent({
      organizationId: null,
      actorAuthUserId: null,
      actorUserId: null,
      action: "auth.login",
      resourceType: "session",
      outcome: "failed",
      metadata: { identifierHash: auditIdentifier(parsed.data.email) },
    });
    return { message: "Email or password is incorrect." };
  }
  await recordPrincipalAuditEvent({
    actorAuthUserId: data.user.id,
    action: "auth.login",
    resourceType: "session",
    metadata: { authenticationMethod: "password" },
  });

  return completeAuthentication(
    safeRedirectPath(formData.get("next")?.toString()),
  );
}

export async function signup(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
      next: z.string().optional(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      next: formData.get("next")?.toString(),
    });
  if (!parsed.success) return validationState(parsed.error);

  const next = safeRedirectPath(parsed.data.next, "/");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { message: "The account could not be created." };

  if (data.session && data.user) {
    await recordPrincipalAuditEvent({
      actorAuthUserId: data.user.id,
      action: "auth.login",
      resourceType: "session",
      metadata: { authenticationMethod: "password_signup" },
    });
    await completeAuthentication(next, "signup");
  }
  const query = new URLSearchParams({ email: parsed.data.email });
  if (next !== "/") query.set("next", next);
  redirect(`/verify-email?${query.toString()}`);
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
  }
  await client.auth.signOut();
  const next = safeRedirectPath(formData?.get("next")?.toString(), "");
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
