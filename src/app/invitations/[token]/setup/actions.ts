"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { OrganizationRepository } from "@/features/organizations/repository";
import { hashInvitationToken } from "@/features/organizations/service";
import { invitationTokenSchema } from "@/features/organizations/validation";
import { bootstrapAndSignInTrustedAccount } from "@/lib/auth/trusted-account-bootstrap";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type InvitationSetupState = Readonly<{
  message?: string;
  fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;
}>;

const schema = z
  .object({
    token: invitationTokenSchema,
    password: z.string().min(12).max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function setupInvitedAccountAction(
  _state: InvitationSetupState,
  formData: FormData,
): Promise<InvitationSetupState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const preview = await new OrganizationRepository(
    createAdminSupabaseClient(),
  ).findInvitationByHash(hashInvitationToken(parsed.data.token));
  if (
    !preview ||
    preview.invitation.acceptedAt ||
    preview.invitation.revokedAt ||
    new Date(preview.invitation.expiresAt) <= new Date()
  )
    return { message: "This invitation is invalid, expired, or unavailable." };
  try {
    await bootstrapAndSignInTrustedAccount({
      email: preview.invitation.email,
      password: parsed.data.password,
      fullName: preview.invitation.email.split("@")[0] ?? "Sightline user",
      accountSource: "organization_invitation",
    });
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "The invited account could not be prepared.",
    };
  }
  redirect(`/invitations/${parsed.data.token}`);
}
