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
  setActiveOrganizationCookie,
} from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  auditIdentifier,
  recordAuditEvent,
  recordAuditEvents,
} from "@/features/audit/service";
import { getServerEnv } from "@/lib/env";
import { TeamRepository } from "@/features/team/repository";
import { resolveOnboardingDestination } from "@/lib/auth/onboarding";
import { sendOrganizationInvitation } from "@/features/email/organization-invitation";

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
  if (message.includes("PLAN_SINGLE_ORGANIZATION_ONLY")) {
    return {
      error: true,
      message:
        "Your current plan supports one organization. Leave your current organization before joining another.",
    };
  }
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
  await setActiveOrganizationCookie(organizationId);
}

export async function createOrganizationAction(
  _state: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  let organizationId: string;
  let principal: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let input: z.infer<typeof createOrganizationSchema>;
  try {
    principal = await requireAuthenticatedUser();
    input = createOrganizationSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
    });
    organizationId = await service().createOrganization(principal, input);
  } catch (error) {
    return errorState(error);
  }

  try {
    await setActiveOrganization(organizationId);
  } catch (error) {
    console.error("Active organization preference could not be stored.", {
      organizationId,
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }
  try {
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
  } catch (error) {
    console.error("Organization onboarding follow-up failed.", {
      organizationId,
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }
  redirect("/projects/new?welcome=organization");
}

export async function switchOrganizationAction(
  _formData: FormData,
): Promise<void> {
  void _formData;
  throw new Error("Organization switching is not available on launch plans.");
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
  let principal: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let membership: Awaited<ReturnType<typeof requireCurrentMembership>>;
  let input: z.infer<typeof createInvitationSchema>;
  let token: string;
  try {
    principal = await requireAuthenticatedUser();
    membership = await requireCurrentMembership();
    input = createInvitationSchema.parse({
      email: formData.get("email"),
      role: formData.get("role") || "contributor",
    });
    token = await service().createInvitation(
      principal,
      membership.organizationId,
      input,
    );
  } catch (error) {
    return errorState(error);
  }

  const invitationUrl = `${getServerEnv().APP_URL}/invitations/${token}`;
  try {
    await recordAuditEvent({
      organizationId: membership.organizationId,
      actorAuthUserId: principal.id,
      actorUserId: membership.applicationUserId,
      action: "invitation.created",
      resourceType: "invitation",
      metadata: {
        inviteeIdentifierHash: auditIdentifier(input.email),
        role: input.role,
      },
    });
    const teamRepository = new TeamRepository(createAdminSupabaseClient());
    await Promise.all([
      teamRepository.appendEvent({
        organizationId: membership.organizationId,
        actorMembershipId: membership.id,
        eventType: "member_invited",
        summary: `A ${input.role} was invited to the organization.`,
        metadata: {
          inviteeIdentifierHash: auditIdentifier(input.email),
          role: input.role,
        },
      }),
      teamRepository.createNotification({
        organizationId: membership.organizationId,
        recipientMembershipId: null,
        eventType: "member_invited",
        payload: {
          inviteeIdentifierHash: auditIdentifier(input.email),
          role: input.role,
        },
      }),
    ]);
  } catch (error) {
    console.error("Organization invitation follow-up recording failed.", {
      organizationId: membership.organizationId,
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }

  let deliveryFailed = false;
  try {
    await sendOrganizationInvitation({
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      email: input.email,
      role: input.role,
      token,
    });
  } catch (error) {
    deliveryFailed = true;
    console.error("Organization invitation email delivery failed.", {
      organizationId: membership.organizationId,
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }
  revalidatePath("/organization/settings");
  revalidatePath("/settings/team");
  return {
    message: deliveryFailed
      ? "Invitation created, but email delivery failed. Share this single-use link securely."
      : "Invitation email sent. You can also share this single-use link securely.",
    invitationUrl,
  };
}

export async function acceptInvitationAction(
  token: string,
  _state: OrganizationActionState,
): Promise<OrganizationActionState> {
  void _state;
  let organizationId: string;
  let principal: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let destination = "/";
  try {
    principal = await requireAuthenticatedUser();
    organizationId = await service().acceptInvitation(principal, token);
  } catch (error) {
    return errorState(error);
  }

  try {
    await setActiveOrganization(organizationId);
  } catch (error) {
    console.error("Active organization preference could not be stored.", {
      organizationId,
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }
  try {
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
  } catch (error) {
    console.error("Invitation acceptance follow-up failed.", {
      organizationId,
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }
  try {
    destination = (
      await resolveOnboardingDestination(principal, {
        preferredOrganizationId: organizationId,
        welcome: "invitation",
      })
    ).destination;
  } catch (error) {
    console.error("Post-invitation destination could not be resolved.", {
      organizationId,
      cause: error instanceof Error ? error.message : "Unknown error",
    });
  }
  redirect(destination);
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
