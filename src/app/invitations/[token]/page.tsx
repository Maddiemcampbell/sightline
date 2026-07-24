import { notFound } from "next/navigation";

import { AcceptInvitationForm } from "@/components/organizations/organization-forms";
import { Card } from "@/components/ui/card";
import { OrganizationRepository } from "@/features/organizations/repository";
import { hashInvitationToken } from "@/features/organizations/service";
import { invitationTokenSchema } from "@/features/organizations/validation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type InvitationPageProps = Readonly<{
  params: Promise<{ token: string }>;
}>;

export default async function InvitationPage({ params }: InvitationPageProps) {
  const principal = await requireAuthenticatedUser();
  const parsedToken = invitationTokenSchema.safeParse((await params).token);
  if (!parsedToken.success) notFound();
  const preview = await new OrganizationRepository(
    await createServerSupabaseClient(),
  ).findInvitationByHash(hashInvitationToken(parsedToken.data));
  if (!preview) notFound();

  const unavailable =
    preview.invitation.acceptedAt ||
    preview.invitation.revokedAt ||
    new Date(preview.invitation.expiresAt) <= new Date();
  const wrongEmail =
    preview.invitation.email.toLowerCase() !== principal.email.toLowerCase();

  return (
    <div className="mx-auto max-w-2xl px-[var(--page-gutter)] py-10">
      <Card>
        <p className="text-muted text-sm font-semibold">
          Organization invitation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Join {preview.organization.name}
        </h1>
        <p className="text-muted mt-3 leading-6">
          This invitation was issued to {preview.invitation.email}. Initial
          memberships have owner access.
        </p>
        <div className="mt-6">
          {unavailable ? (
            <p role="alert" className="bg-soft-red text-danger rounded-md p-3">
              This invitation is no longer available.
            </p>
          ) : wrongEmail ? (
            <p role="alert" className="bg-soft-red text-danger rounded-md p-3">
              Log in as {preview.invitation.email} to accept this invitation.
            </p>
          ) : (
            <AcceptInvitationForm token={parsedToken.data} />
          )}
        </div>
      </Card>
    </div>
  );
}
