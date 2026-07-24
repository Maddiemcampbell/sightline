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
import {
  auditIdentifier,
  recordAuditEvent,
  recordAuditEvents,
} from "@/features/audit/service";
import { getServerEnv } from "@/lib/env";

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
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.SIGHTLINE_E2E !== "true",
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
    const createdMembership = await new OrganizationRepository(
      createAdminSupabaseClient(),
    ).findMembership(principal.id, organizationId);
    if (!createdMembership)
      throw new Error("Created organization membership could not be loaded.");
    await recordAuditEvents([
      {
        organizationId,
        actorAuthUserId: principal.id,
        actorUserId: createdMembership.applicationUserId,
        action: "organization.created",
        resourceType: "organization",
        resourceId: organizationId,
        metadata: { slug: input.slug },
      },
      {
        organizationId,
        actorAuthUserId: principal.id,
        actorUserId: createdMembership.applicationUserId,
        action: "membership.created",
        resourceType: "organization_membership",
        resourceId: createdMembership.id,
        metadata: { role: createdMembership.role },
      },
      {
        organizationId,
        actorAuthUserId: principal.id,
        actorUserId: createdMembership.applicationUserId,
        action: "authorization.permission_changed",
        resourceType: "organization_membership",
        resourceId: createdMembership.id,
        metadata: { fromRole: null, toRole: createdMembership.role },
      },
    ]);
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
  await recordAuditEvent({
    organizationId,
    actorAuthUserId: principal.id,
    actorUserId: membership.applicationUserId,
    action: "settings.updated",
    resourceType: "active_organization",
    resourceId: organizationId,
    metadata: { setting: "activeOrganization" },
  });
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
    await recordAuditEvent({
      organizationId: membership.organizationId,
      actorAuthUserId: principal.id,
      actorUserId: membership.applicationUserId,
      action: "organization.updated",
      resourceType: "organization",
      resourceId: membership.organizationId,
      metadata: { changedFields: ["name", "slug"] },
    });
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
    await recordAuditEvent({
      organizationId: membership.organizationId,
      actorAuthUserId: principal.id,
      actorUserId: membership.applicationUserId,
      action: "invitation.created",
      resourceType: "invitation",
      metadata: { inviteeIdentifierHash: auditIdentifier(input.email) },
    });
    const origin = getServerEnv().APP_URL;
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
    const membership = await new OrganizationRepository(
      createAdminSupabaseClient(),
    ).findMembership(principal.id, organizationId);
    if (!membership)
      throw new Error("Accepted organization membership could not be loaded.");
    await recordAuditEvents([
      {
        organizationId,
        actorAuthUserId: principal.id,
        actorUserId: membership.applicationUserId,
        action: "invitation.accepted",
        resourceType: "invitation",
        metadata: {},
      },
      {
        organizationId,
        actorAuthUserId: principal.id,
        actorUserId: membership.applicationUserId,
        action: "membership.created",
        resourceType: "organization_membership",
        resourceId: membership.id,
        metadata: { role: membership.role },
      },
      {
        organizationId,
        actorAuthUserId: principal.id,
        actorUserId: membership.applicationUserId,
        action: "authorization.permission_changed",
        resourceType: "organization_membership",
        resourceId: membership.id,
        metadata: { fromRole: null, toRole: membership.role },
      },
    ]);
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
    await recordAuditEvents([
      {
        organizationId: membership.organizationId,
        actorAuthUserId: principal.id,
        actorUserId: membership.applicationUserId,
        action: "membership.deleted",
        resourceType: "organization_membership",
        resourceId: membership.id,
        metadata: { previousRole: membership.role },
      },
      {
        organizationId: membership.organizationId,
        actorAuthUserId: principal.id,
        actorUserId: membership.applicationUserId,
        action: "authorization.permission_changed",
        resourceType: "organization_membership",
        resourceId: membership.id,
        metadata: { fromRole: membership.role, toRole: null },
      },
    ]);
    const remainingMembership = (
      await new OrganizationRepository(
        createAdminSupabaseClient(),
      ).listMemberships(principal.id)
    )[0];
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
