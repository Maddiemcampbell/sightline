import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { platformCan } from "@/features/platform-admin/capabilities";
import { CopyIdButton } from "@/features/platform-admin/copy-id-button";
import { CustomerDirectoryRepository } from "@/features/platform-admin/customer-directory-repository";
import { ProductionUserService } from "@/features/platform-admin/customer-directory-service";
import {
  AdminStatusBadge,
  UnavailableValue,
  humanize,
} from "@/features/platform-admin/customer-directory-ui";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const operator = await requirePlatformPermission(
    "platform.users.read",
    "auth_user",
    userId,
  );
  const service = new ProductionUserService(
    new CustomerDirectoryRepository(createAdminSupabaseClient()),
  );
  const user = await service.get(operator, userId);
  if (!user) notFound();

  const [membershipsSection, invitationsSection, activitySection] =
    await Promise.all([
      platformCan(operator, "platform.organizations.read")
        ? settle(service.memberships(operator, userId))
        : Promise.resolve({ data: null, failed: false }),
      settle(service.invitations(operator, user)),
      platformCan(operator, "platform.audit.read")
        ? settle(service.activity(operator, userId))
        : Promise.resolve({ data: null, failed: false }),
    ]);

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7">
      <Link
        href="/internal/admin/users"
        className="text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Users
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {user.fullName}
            </h1>
            <AdminStatusBadge status={user.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {user.email ?? "Email unavailable"}
          </p>
          <p className="mt-2 font-mono text-xs text-slate-500">{user.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyIdButton id={user.id} />
          {platformCan(operator, "platform.audit.read") ? (
            <Link
              href={`/internal/admin/audit?authUserId=${user.id}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            >
              Filtered audit history
            </Link>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="account-information" className="mt-7">
        <h2 id="account-information" className="text-base font-semibold">
          Account information
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Status" value={humanize(user.status)} />
          <SummaryMetric
            label="Email verification"
            value={user.emailVerified ? "Verified" : "Not verified"}
          />
          <SummaryMetric
            label="Auth provider"
            value={humanize(user.authProvider)}
          />
          <SummaryMetric label="Created" value={formatDate(user.createdAt)} />
          <SummaryMetric
            label="Last login"
            value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : null}
          />
          <SummaryMetric
            label="Last activity"
            value={
              user.lastActivityAt ? formatDateTime(user.lastActivityAt) : null
            }
          />
          <SummaryMetric
            label="MFA"
            value={user.mfaEnabled ? "Enabled" : "Not enabled"}
          />
          <SummaryMetric label="Active sessions" value={null} />
          <SummaryMetric label="Recent failed logins" value={null} />
        </dl>
      </section>

      <section
        aria-labelledby="organization-memberships"
        className="border-border mt-7 overflow-hidden rounded-lg border bg-white"
      >
        <div className="border-b border-slate-200 p-5">
          <h2 id="organization-memberships" className="font-semibold">
            Organization memberships
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Read-only access relationships. Support impersonation and membership
            mutations are intentionally unavailable.
          </p>
        </div>
        {!platformCan(operator, "platform.organizations.read") ? (
          <SectionPermissionMessage permission="platform.organizations.read" />
        ) : membershipsSection.failed ? (
          <SectionFailureMessage label="memberships" />
        ) : membershipsSection.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  {[
                    "Organization",
                    "Role",
                    "Organization status",
                    "Joined",
                    "Last active",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {membershipsSection.data.map((membership) => (
                  <tr key={membership.membershipId}>
                    <td className="px-4 py-4">
                      <Link
                        href={`/internal/admin/organizations/${membership.organizationId}`}
                        className="font-semibold hover:underline"
                      >
                        {membership.organizationName}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {membership.organizationId}
                      </p>
                    </td>
                    <td className="px-4 py-4">{humanize(membership.role)}</td>
                    <td className="px-4 py-4">
                      {humanize(membership.organizationStatus)}
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(membership.joinedAt)}
                    </td>
                    <td className="px-4 py-4">
                      {membership.lastActiveAt ? (
                        formatDateTime(membership.lastActiveAt)
                      ) : (
                        <UnavailableValue />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            This user has no organization memberships.
          </p>
        )}
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="user-invitations"
          className="border-border rounded-lg border bg-white p-5"
        >
          <h2 id="user-invitations" className="font-semibold">
            Invitation state
          </h2>
          {invitationsSection.failed ? (
            <SectionFailureMessage label="invitations" />
          ) : invitationsSection.data?.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {invitationsSection.data.map((invitation) => (
                <li
                  key={`${invitation.organizationId}-${invitation.createdAt}`}
                  className="py-3"
                >
                  {platformCan(operator, "platform.organizations.read") ? (
                    <Link
                      href={`/internal/admin/organizations/${invitation.organizationId}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {invitation.organizationName}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold">
                      Organization details restricted
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {humanize(invitation.status)} ·{" "}
                    {formatDateTime(invitation.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No invitation history is available for this account.
            </p>
          )}
        </section>

        <section
          aria-labelledby="user-activity"
          className="border-border rounded-lg border bg-white p-5"
        >
          <h2 id="user-activity" className="font-semibold">
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
      className="mt-3 rounded-md bg-red-50 p-4 text-sm text-red-800"
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
