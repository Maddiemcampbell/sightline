import Link from "next/link";

import { Card } from "@/components/ui/card";
import { OrganizationRepository } from "@/features/organizations/repository";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  const membership = await requireCurrentMembership();
  const members = await new OrganizationRepository(
    createAdminSupabaseClient(),
  ).listMemberProfiles(membership.organizationId);

  return (
    <div className="mx-auto max-w-4xl px-[var(--page-gutter)] py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted text-sm font-semibold">Organization profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {membership.organization.name}
          </h1>
          <p className="text-muted mt-2">/{membership.organization.slug}</p>
        </div>
        <Link
          href="/organization/settings"
          className="bg-deep-green rounded-md px-4 py-2 text-sm font-semibold text-white"
        >
          Organization settings
        </Link>
      </header>
      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Profile</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted">Name</dt>
              <dd className="mt-1 font-semibold">{membership.organization.name}</dd>
            </div>
            <div>
              <dt className="text-muted">Slug</dt>
              <dd className="mt-1 font-semibold">{membership.organization.slug}</dd>
            </div>
            <div>
              <dt className="text-muted">Timezone</dt>
              <dd className="mt-1 font-semibold">
                {membership.organization.timezone}
              </dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="font-semibold">Owners</h2>
          <ul className="mt-5 divide-y">
            {members.map((member) => (
              <li key={member.membershipId} className="py-3 first:pt-0">
                <p className="text-sm font-semibold">{member.fullName}</p>
                <p className="text-muted text-sm">{member.email}</p>
                <p className="text-deep-green mt-1 text-xs font-semibold uppercase">
                  Owner
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
