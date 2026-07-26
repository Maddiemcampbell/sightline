import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { platformCan } from "@/features/platform-admin/capabilities";
import { CopyIdButton } from "@/features/platform-admin/copy-id-button";
import { CustomerDirectoryRepository } from "@/features/platform-admin/customer-directory-repository";
import { ProductionOrganizationService } from "@/features/platform-admin/customer-directory-service";
import {
  AdminStatusBadge,
  UnavailableValue,
  humanize,
} from "@/features/platform-admin/customer-directory-ui";
import type { PlatformPermission } from "@/features/platform-admin/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformOrganizationDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const operator = await requirePlatformPermission(
    "platform.organizations.read",
    "organization",
    organizationId,
  );
  const service = new ProductionOrganizationService(
    new CustomerDirectoryRepository(createAdminSupabaseClient()),
  );
  const organization = await service.get(operator, organizationId);
  if (!organization) notFound();
  const [membersSection, activitySection] = await Promise.all([
    platformCan(operator, "platform.users.read")
      ? settle(service.members(operator, organizationId))
      : Promise.resolve({ data: null, failed: false }),
    platformCan(operator, "platform.audit.read")
      ? settle(service.activity(operator, organizationId))
      : Promise.resolve({ data: null, failed: false }),
  ]);
  const signals = service.signals(organization);
  const environment =
    process.env.VERCEL_ENV ??
    (process.env.NODE_ENV === "production" ? "production" : "development");

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7">
      <Link
        href="/internal/admin/organizations"
        className="text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Organizations
      </Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {organization.name}
            </h1>
            <AdminStatusBadge status={organization.status} />
          </div>
          <p className="mt-2 font-mono text-xs text-slate-500">
            {organization.id}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Created {formatDate(organization.createdAt)} ·{" "}
            {organization.lastActivityAt
              ? `Last active ${formatDate(organization.lastActivityAt)}`
              : "Last activity unavailable"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold capitalize ring-1 ring-slate-200">
            {environment}
          </span>
          <CopyIdButton id={organization.id} />
          {platformCan(operator, "platform.audit.read") ? (
            <Link
              href={`/internal/admin/audit?organizationId=${organization.id}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            >
              Filtered audit history
            </Link>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="organization-summary" className="mt-7">
        <h2 id="organization-summary" className="text-base font-semibold">
          Account summary
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric
            label="Account status"
            value={humanize(organization.status)}
          />
          <SummaryMetric label="Plan" value={null} />
          <SummaryMetric
            label="Created"
            value={formatDate(organization.createdAt)}
          />
          <SummaryMetric
            label="Last activity"
            value={
              organization.lastActivityAt
                ? formatDate(organization.lastActivityAt)
                : null
            }
          />
          <SummaryMetric
            label="Members"
            value={String(organization.memberCount)}
          />
          <SummaryMetric
            label="Active projects"
            value={String(organization.activeProjectCount)}
          />
          <SummaryMetric
            label="Storage usage"
            value={formatBytes(organization.storageBytes)}
          />
          <SummaryMetric label="AI usage" value={null} />
          <SummaryMetric label="Open support issues" value={null} />
          <SummaryMetric
            label="Failed jobs"
            value={String(organization.failedJobCount)}
          />
          <SummaryMetric
            label="Email failures"
            value={String(organization.failedDeliveryCount)}
          />
        </dl>
      </section>

      <section
        aria-labelledby="organization-members"
        className="border-border mt-7 overflow-hidden rounded-lg border bg-white"
      >
        <div className="border-b border-slate-200 p-5">
          <h2 id="organization-members" className="font-semibold">
            Members and invitations
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Read-only organization access state. No support mutations are
            available in this phase.
          </p>
        </div>
        {!platformCan(operator, "platform.users.read") ? (
          <SectionPermissionMessage permission="platform.users.read" />
        ) : membersSection.failed ? (
          <SectionFailureMessage label="members" />
        ) : membersSection.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  {[
                    "Member",
                    "Role",
                    "Membership",
                    "Invitation",
                    "Joined",
                    "Last login",
                    "MFA",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {membersSection.data.map((member) => (
                  <tr key={member.membershipId ?? `invitation-${member.email}`}>
                    <td className="px-4 py-4">
                      {member.userId ? (
                        <Link
                          href={`/internal/admin/users/${member.userId}`}
                          className="font-semibold hover:underline"
                        >
                          {member.fullName ?? "Name unavailable"}
                        </Link>
                      ) : (
                        <span className="font-semibold">
                          Invitation pending
                        </span>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {member.email}
                      </p>
                    </td>
                    <td className="px-4 py-4">{humanize(member.role)}</td>
                    <td className="px-4 py-4">
                      {humanize(member.membershipStatus)}
                    </td>
                    <td className="px-4 py-4">
                      {humanize(member.invitationStatus)}
                    </td>
                    <td className="px-4 py-4">
                      {member.joinedAt ? (
                        formatDate(member.joinedAt)
                      ) : (
                        <UnavailableValue />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {member.lastLoginAt ? (
                        formatDate(member.lastLoginAt)
                      ) : (
                        <UnavailableValue />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {member.mfaEnabled === null
                        ? "Unknown"
                        : member.mfaEnabled
                          ? "Enabled"
                          : "Not enabled"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            No members or invitations.
          </p>
        )}
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="organization-activity"
          className="border-border rounded-lg border bg-white p-5"
        >
          <h2 id="organization-activity" className="font-semibold">
            Safe account activity
          </h2>
          {!platformCan(operator, "platform.audit.read") ? (
            <SectionPermissionMessage permission="platform.audit.read" />
          ) : activitySection.failed ? (
            <SectionFailureMessage label="activity" />
          ) : activitySection.data?.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {activitySection.data.map((activity) => (
                <li key={activity.id} className="py-3">
                  <p className="text-sm font-semibold">
                    {humanize(activity.action.replaceAll(".", " "))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(activity.occurredAt)} ·{" "}
                    {humanize(activity.outcome)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No safe account activity recorded.
            </p>
          )}
        </section>
        <section
          aria-labelledby="operational-signals"
          className="border-border rounded-lg border bg-white p-5"
        >
          <h2 id="operational-signals" className="font-semibold">
            Operational signals
          </h2>
          {signals.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {signals.map((signal) => (
                <li
                  key={signal.type}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="text-sm">{signal.label}</span>
                  {platformCan(operator, signalPermission(signal.type)) ? (
                    <Link
                      href={signal.href}
                      className="text-sm font-semibold text-amber-800 hover:underline"
                    >
                      {signal.count} failed
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-amber-800">
                      {signal.count} failed
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No current operational failure signals.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="border-border rounded-md border bg-white p-4">
      <dt className="text-xs font-semibold text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-lg font-semibold">
        {value ?? <UnavailableValue />}
      </dd>
    </div>
  );
}

function SectionPermissionMessage({ permission }: { permission: string }) {
  return (
    <p className="m-5 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
      Additional capability required: <code>{permission}</code>
    </p>
  );
}

function SectionFailureMessage({ label }: { label: string }) {
  return (
    <p
      role="alert"
      className="m-5 rounded-md bg-red-50 p-4 text-sm text-red-800"
    >
      The {label} section could not be loaded.{" "}
      <a href="" className="font-semibold underline">
        Try again
      </a>
      .
    </p>
  );
}

async function settle<T>(promise: Promise<T>) {
  try {
    return { data: await promise, failed: false as const };
  } catch {
    return { data: null, failed: true as const };
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatBytes(value: number) {
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} KB`;
  if (value < 1_073_741_824) return `${(value / 1_048_576).toFixed(1)} MB`;
  return `${(value / 1_073_741_824).toFixed(1)} GB`;
}

function signalPermission(type: "jobs" | "email" | "exports" | "ai") {
  return (
    {
      jobs: "platform.jobs.read",
      email: "platform.health.read",
      exports: "platform.health.read",
      ai: "platform.ai.read",
    } as const
  )[type] satisfies PlatformPermission;
}
