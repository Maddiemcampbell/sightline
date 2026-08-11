import { Building2, Settings, Users } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { OrganizationRepository } from "@/features/organizations/repository";
import { OrganizationSettingsPanel } from "@/features/organizations/organization-settings-panel";
import { TeamManagement } from "@/features/team/team-management";
import {
  canManageMembers,
  canManageOrganization,
  canManageProjectMembers,
} from "@/lib/auth/authorization";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Section = "overview" | "team" | "settings";

const sections = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "team", label: "Team & access", icon: Users },
  { key: "settings", label: "Organization settings", icon: Settings },
] as const;

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const membership = await requireCurrentMembership();
  const requestedSection = (await searchParams).section;
  const section: Section =
    typeof requestedSection === "string" &&
    sections.some(({ key }) => key === requestedSection)
      ? (requestedSection as Section)
      : "overview";
  const client = createAdminSupabaseClient();
  const repository = new OrganizationRepository(client);
  const [members, invitations, projectsResult, organizationResult] =
    await Promise.all([
      repository.listMemberProfiles(membership.organizationId),
      repository.listInvitations(membership.organizationId),
      client
        .from("projects")
        .select("id,name")
        .eq("organization_id", membership.organizationId)
        .order("name"),
      client
        .from("organizations")
        .select("*")
        .eq("id", membership.organizationId)
        .single(),
    ]);
  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (organizationResult.error)
    throw new Error(organizationResult.error.message);

  const owners = members.filter((member) => member.role === "owner");
  const activeInvitations = invitations.filter(
    (invitation) => !invitation.acceptedAt && !invitation.revokedAt,
  );

  return (
    <div className="mx-auto max-w-6xl px-[var(--page-gutter)] py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-deep-green text-sm font-semibold">
            Organization workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {membership.organization.name}
          </h1>
          <p className="text-muted mt-2">
            Manage your company profile, team, and organization-wide defaults.
          </p>
        </div>
        <span className="bg-soft-green text-deep-green rounded-full px-3 py-1.5 text-sm font-semibold">
          {membership.organization.planKey === "professional"
            ? "Professional"
            : "Essential"}
        </span>
      </header>

      <nav aria-label="Organization sections" className="mt-7">
        <ul className="border-border flex gap-1 overflow-x-auto border-b">
          {sections.map(({ key, label, icon: Icon }) => {
            const active = key === section;
            return (
              <li key={key}>
                <Link
                  href={
                    key === "overview"
                      ? "/organization"
                      : `/organization?section=${key}`
                  }
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? "border-deep-green text-deep-green"
                      : "text-muted hover:text-deep-green border-transparent"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-7">
        {section === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Summary
                label="Members"
                value={String(members.length)}
                detail={`${owners.length} ${owners.length === 1 ? "owner" : "owners"}`}
              />
              <Summary
                label="Projects"
                value={String(projectsResult.data.length)}
                detail="In this workspace"
              />
              <Summary
                label="Invitations"
                value={String(activeInvitations.length)}
                detail="Awaiting response"
              />
              <Summary
                label="Timezone"
                value={organizationResult.data.timezone}
                detail={organizationResult.data.default_currency}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Company profile</h2>
                    <p className="text-muted mt-1 text-sm">
                      Shared identity and reporting defaults.
                    </p>
                  </div>
                  <Link
                    href="/organization?section=settings"
                    className="text-deep-green text-sm font-semibold"
                  >
                    Edit settings
                  </Link>
                </div>
                <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Detail
                    label="Organization name"
                    value={organizationResult.data.name}
                  />
                  <Detail
                    label="Workspace URL"
                    value={`/${organizationResult.data.slug}`}
                  />
                  <Detail
                    label="Industry"
                    value={organizationResult.data.industry ?? "Not specified"}
                  />
                  <Detail
                    label="Company size"
                    value={
                      organizationResult.data.company_size ?? "Not specified"
                    }
                  />
                </dl>
              </Card>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Team access</h2>
                    <p className="text-muted mt-1 text-sm">
                      People responsible for this workspace.
                    </p>
                  </div>
                  <Link
                    href="/organization?section=team"
                    className="text-deep-green text-sm font-semibold"
                  >
                    Manage team
                  </Link>
                </div>
                <ul className="mt-5 divide-y">
                  {owners.map((owner) => (
                    <li key={owner.membershipId} className="py-3 first:pt-0">
                      <p className="text-sm font-semibold">{owner.fullName}</p>
                      <p className="text-muted truncate text-sm">
                        {owner.email}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        ) : null}

        {section === "team" ? (
          <TeamManagement
            embedded
            organizationName={membership.organization.name}
            currentMembershipId={membership.id}
            canManage={canManageMembers(membership)}
            canManageProjects={canManageProjectMembers(membership)}
            members={members}
            invitations={invitations}
            projects={projectsResult.data}
          />
        ) : null}

        {section === "settings" ? (
          <OrganizationSettingsPanel
            organization={organizationResult.data}
            canManage={canManageOrganization(membership)}
          />
        ) : null}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-muted text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className="text-muted mt-1 text-sm">{detail}</p>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs font-semibold uppercase">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
