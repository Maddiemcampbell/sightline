import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { OrganizationRepository } from "@/features/organizations/repository";
import { hashInvitationToken } from "@/features/organizations/service";
import { invitationTokenSchema } from "@/features/organizations/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { InvitationAccountSetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function InvitationSetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const parsed = invitationTokenSchema.safeParse((await params).token);
  if (!parsed.success) notFound();
  const preview = await new OrganizationRepository(
    createAdminSupabaseClient(),
  ).findInvitationByHash(hashInvitationToken(parsed.data));
  if (
    !preview ||
    preview.invitation.acceptedAt ||
    preview.invitation.revokedAt ||
    new Date(preview.invitation.expiresAt) <= new Date()
  )
    notFound();
  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <Card>
        <p className="text-deep-green text-sm font-semibold">
          Organization invitation
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Join {preview.organization.name}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Create credentials for {preview.invitation.email}, or{" "}
          <Link
            className="font-semibold underline"
            href={`/login?next=${encodeURIComponent(`/invitations/${parsed.data}`)}`}
          >
            log in
          </Link>{" "}
          if you already have an account.
        </p>
        <InvitationAccountSetupForm token={parsed.data} />
      </Card>
    </div>
  );
}
