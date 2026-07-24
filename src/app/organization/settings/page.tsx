import { Card } from "@/components/ui/card";
import {
  InvitationForm,
  LeaveOrganizationForm,
  OrganizationProfileForm,
} from "@/components/organizations/organization-forms";
import { OrganizationRepository } from "@/features/organizations/repository";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage() {
  const membership = await requireCurrentMembership();
  const invitations = await new OrganizationRepository(
    await createServerSupabaseClient(),
  ).listInvitations(membership.organizationId);

  return (
    <div className="mx-auto max-w-4xl px-[var(--page-gutter)] py-10">
      <header>
        <p className="text-muted text-sm font-semibold">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Organization settings
        </h1>
        <p className="text-muted mt-2">
          Manage the profile and owner invitations for{" "}
          {membership.organization.name}.
        </p>
      </header>
      <div className="mt-7 space-y-6">
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Organization profile</h2>
          <OrganizationProfileForm
            mode="update"
            name={membership.organization.name}
            slug={membership.organization.slug}
          />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Invite an owner</h2>
          <p className="text-muted mt-2 mb-5 text-sm">
            All memberships are owners until role management is introduced.
          </p>
          <InvitationForm />
          {invitations.length ? (
            <ul className="mt-6 divide-y">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex justify-between gap-4 py-3 text-sm"
                >
                  <span>{invitation.email}</span>
                  <span className="text-muted">
                    {invitation.acceptedAt
                      ? "Accepted"
                      : invitation.revokedAt
                        ? "Revoked"
                        : new Date(invitation.expiresAt) <= new Date()
                          ? "Expired"
                          : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
        <Card className="border-danger/30">
          <h2 className="text-lg font-semibold">Leave organization</h2>
          <p className="text-muted mt-2 mb-5 text-sm">
            The final owner cannot leave. Organization data is not deleted when
            an owner leaves.
          </p>
          <LeaveOrganizationForm />
        </Card>
      </div>
    </div>
  );
}
