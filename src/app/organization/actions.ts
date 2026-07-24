"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { OrganizationRepository } from "@/features/organizations/repository";
import { OrganizationService } from "@/features/organizations/service";
import {
  createInvitationSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
} from "@/features/organizations/validation";
import {
  ACTIVE_ORGANIZATION_COOKIE,
  requireAuthenticatedUser,
  requireCurrentMembership,
} from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type OrganizationActionState = Readonly<{
  error?: boolean;
  message?: string;
  invitationUrl?: string;
  fieldErrors?: Readonly<Record<string, readonly string[] | undefined>>;
}>;

function service(): OrganizationService {
  return new OrganizationService(
    new OrganizationRepository(createAdminSupabaseClient()),
  );
}

function errorState(error: unknown): OrganizationActionState {
  if (error instanceof z.ZodError) {
    return { error: true, fieldErrors: error.flatten().fieldErrors };
  }
  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("slug")) {
    return {
      error: true,
      fieldErrors: { slug: ["That organization slug is unavailable."] },
    };
  }
  if (
    message.includes("invitations_pending_organization_email_idx") ||
    message.toLowerCase().includes("duplicate")
  ) {
    return {
      error: true,
      fieldErrors: {
        email: ["A pending invitation already exists for this email."],
      },
    };
  }
  if (message.includes("final owner")) {
    return {
      error: true,
      message:
        "The final owner cannot leave. Invite another owner before leaving.",
    };
  }
  if (message.toLowerCase().includes("invitation")) {
    return {
      error: true,
      message: "This invitation is invalid, expired, or unavailable.",
    };
  }
  return {
    error: true,
    message: "The organization request could not be completed.",
  };
}

async function setActiveOrganization(organizationId: string): Promise<void> {
  (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function createOrganizationAction(
  _state: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const principal = await requireAuthenticatedUser();
    const input = createOrganizationSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
    });
    const organizationId = await service().createOrganization(principal, input);
    await setActiveOrganization(organizationId);
  } catch (error) {
    return errorState(error);
  }
  redirect("/");
}

export async function switchOrganizationAction(
  formData: FormData,
): Promise<void> {
  const organizationId = z.uuid().parse(formData.get("organizationId"));
  const principal = await requireAuthenticatedUser();
  const membership = await new OrganizationRepository(
    createAdminSupabaseClient(),
  ).findMembership(principal.id, organizationId);
  if (!membership) throw new Error("Organization access denied.");
  await setActiveOrganization(organizationId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateOrganizationAction(
  _state: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const principal = await requireAuthenticatedUser();
    const membership = await requireCurrentMembership();
    const input = updateOrganizationSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
    });
    await service().updateOrganization(
      principal,
      membership.organizationId,
      input,
    );
    revalidatePath("/", "layout");
    return { message: "Organization profile updated." };
  } catch (error) {
    return errorState(error);
  }
}

export async function createInvitationAction(
  _state: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const principal = await requireAuthenticatedUser();
    const membership = await requireCurrentMembership();
    const input = createInvitationSchema.parse({
      email: formData.get("email"),
    });
    const token = await service().createInvitation(
      principal,
      membership.organizationId,
      input,
    );
    const origin = process.env.APP_URL ?? "http://localhost:3000";
    revalidatePath("/organization/settings");
    return {
      message: "Invitation created. Share this single-use link securely.",
      invitationUrl: `${origin}/invitations/${token}`,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function acceptInvitationAction(
  token: string,
  _state: OrganizationActionState,
): Promise<OrganizationActionState> {
  void _state;
  try {
    const principal = await requireAuthenticatedUser();
    const organizationId = await service().acceptInvitation(principal, token);
    await setActiveOrganization(organizationId);
  } catch (error) {
    return errorState(error);
  }
  redirect("/");
}

export async function leaveOrganizationAction(
  _state: OrganizationActionState,
): Promise<OrganizationActionState> {
  void _state;
  let destination = "/organizations/new";
  try {
    const principal = await requireAuthenticatedUser();
    const membership = await requireCurrentMembership();
    await service().leaveOrganization(principal, membership.organizationId);
    const remainingMembership = (await new OrganizationRepository(
      createAdminSupabaseClient(),
    ).listMemberships(principal.id))[0];
    if (remainingMembership) {
      await setActiveOrganization(remainingMembership.organizationId);
      destination = "/";
    } else {
      (await cookies()).delete(ACTIVE_ORGANIZATION_COOKIE);
    }
  } catch (error) {
    return errorState(error);
  }
  redirect(destination);
}
