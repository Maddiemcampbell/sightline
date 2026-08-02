import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { OrganizationProfileForm } from "@/components/organizations/organization-forms";
import {
  getCurrentMemberships,
  requireAuthenticatedUser,
} from "@/lib/auth/session";

export default async function NewOrganizationPage() {
  await requireAuthenticatedUser();
  const memberships = await getCurrentMemberships();
  if (memberships.length) redirect("/");

  return (
    <div className="mx-auto max-w-2xl px-[var(--page-gutter)] py-10">
      <header>
        <p className="text-muted text-sm font-semibold">V3.1 workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Create an organization
        </h1>
        <p className="text-muted mt-2">
          Projects, risks, documents, actions, evidence, AI conversations,
          activity, and Daily Briefs will belong to this organization.
        </p>
        <p className="bg-soft-green text-deep-green mt-5 rounded-md p-4 text-sm leading-6">
          Have an invitation? Open the invitation link you received instead.
          Sightline will preserve it through login and email verification.
        </p>
      </header>
      <Card className="mt-7">
        <OrganizationProfileForm mode="create" />
      </Card>
    </div>
  );
}
