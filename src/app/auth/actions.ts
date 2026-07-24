"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeRedirectPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthActionState = Readonly<{
  message?: string;
  fieldErrors?: Readonly<{
    email?: readonly string[];
    password?: readonly string[];
    confirmPassword?: readonly string[];
  }>;
}>;

const emailSchema = z.email("Enter a valid email address.").trim();
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

function siteUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function validationState(
  error: z.ZodError,
): AuthActionState {
  return { fieldErrors: error.flatten().fieldErrors };
}

export async function login(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Enter your password.") })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) return validationState(parsed.error);

  const client = await createServerSupabaseClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return { message: "Email or password is incorrect." };

  redirect(safeRedirectPath(formData.get("next")?.toString()));
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
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
  if (!parsed.success) return validationState(parsed.error);

  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/verify-email`,
    },
  });
  if (error) return { message: error.message };

  if (data.session) redirect("/");
  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function requestPasswordReset(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { fieldErrors: { email: parsed.error.issues.map((issue) => issue.message) } };
  }

  const client = await createServerSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return { message: "We could not send a reset email. Try again." };

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
  const { error } = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      message:
        "This reset link is invalid or expired. Request a new password reset.",
    };
  }

  redirect("/login?reset=success");
}

export async function logout(): Promise<void> {
  const client = await createServerSupabaseClient();
  await client.auth.signOut();
  redirect("/login");
}
