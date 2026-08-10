import Link from "next/link";

import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { CopyIdButton } from "@/features/platform-admin/copy-id-button";
import { CustomerDirectoryRepository } from "@/features/platform-admin/customer-directory-repository";
import { ProductionOrganizationService } from "@/features/platform-admin/customer-directory-service";
import {
  AdminStatusBadge,
  DirectoryPagination,
  UnavailableValue,
} from "@/features/platform-admin/customer-directory-ui";
import { organizationListInputSchema } from "@/features/platform-admin/customer-directory-validation";
import {
  firstParam,
  preservedParams,
  type RawSearchParams,
} from "@/features/platform-admin/directory-params";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const operator = await requirePlatformPermission(
    "platform.organizations.read",
    "admin_page",
    "organizations",
  );
  const raw = await searchParams;
  const input = organizationListInputSchema.parse({
    query: firstParam(raw, "q") ?? "",
    status: firstParam(raw, "status"),
    members: firstParam(raw, "members"),
    issues: firstParam(raw, "issues"),
    recentDays: firstParam(raw, "recent"),
    createdDays: firstParam(raw, "created"),
    sort: firstParam(raw, "sort"),
    page: firstParam(raw, "page"),
    pageSize: firstParam(raw, "size"),
  });
  const organizations = await new ProductionOrganizationService(
    new CustomerDirectoryRepository(createAdminSupabaseClient()),
  ).list(operator, input);
  const params = preservedParams(raw);
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
            Customer Directory
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Organizations
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Locate customer accounts and inspect operational account metadata.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{organizations.total}</p>
          <p className="text-xs text-slate-500">organizations</p>
        </div>
      </div>

      <form className="border-border mt-7 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(7,minmax(8rem,auto))_auto]">
        <label className="text-xs font-semibold text-slate-600">
          Search
          <input
            name="q"
            type="search"
            defaultValue={input.query}
            placeholder="Name or exact organization ID"
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal"
          />
        </label>
        <FilterSelect
          name="status"
          label="Status"
          value={input.status}
          options={[
            ["all", "All statuses"],
            ["active", "Active"],
            ["pending_deletion", "Pending deletion"],
            ["archived", "Archived"],
          ]}
        />
        <FilterSelect
          name="members"
          label="Members"
          value={input.members}
          options={[
            ["all", "Any membership"],
            ["yes", "Has members"],
            ["no", "No members"],
          ]}
        />
        <FilterSelect
          name="issues"
          label="Issues"
          value={input.issues}
          options={[
            ["all", "Any issue state"],
            ["yes", "Has current issues"],
            ["no", "No current issues"],
          ]}
        />
        <FilterSelect
          name="recent"
          label="Activity"
          value={input.recentDays}
          options={[
            ["all", "Any activity"],
            ["7", "Last 7 days"],
            ["30", "Last 30 days"],
            ["90", "Last 90 days"],
          ]}
        />
        <FilterSelect
          name="created"
          label="Created"
          value={input.createdDays}
          options={[
            ["all", "Any created date"],
            ["30", "Last 30 days"],
            ["90", "Last 90 days"],
            ["365", "Last year"],
          ]}
        />
        <FilterSelect
          name="sort"
          label="Sort"
          value={input.sort}
          options={[
            ["activity", "Recent activity"],
            ["created", "Recently created"],
            ["name", "Organization name"],
            ["members", "Member count"],
          ]}
        />
        <label className="text-xs font-semibold text-slate-600">
          Page size
          <select
            name="size"
            defaultValue={String(input.pageSize)}
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Apply
          </button>
          <Link
            href={`/internal/admin/organizations?${params.toString()}`}
            className="grid min-h-10 place-items-center rounded-md border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50"
          >
            Refresh
          </Link>
        </div>
      </form>

      <section className="border-border mt-5 overflow-hidden rounded-lg border bg-white shadow-sm">
        {organizations.items.length ? (
          <>
            <div
              className="divide-y divide-slate-100 md:hidden"
              aria-label="Organization results"
            >
              {organizations.items.map((organization) => (
                <article key={organization.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/internal/admin/organizations/${organization.id}`}
                        className="font-semibold text-slate-950 hover:underline"
                      >
                        {organization.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {organization.memberCount} members ·{" "}
                        {organization.activeProjectCount} active projects
                      </p>
                    </div>
                    <AdminStatusBadge status={organization.status} />
                  </div>
                  {organization.hasOperationalIssues ? (
                    <p className="mt-3 text-sm font-semibold text-amber-800">
                      Needs operational review
                    </p>
                  ) : null}
                  <details className="mt-3 border-t border-slate-100 pt-3">
                    <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-slate-700">
                      More details
                    </summary>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pb-2 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Created</dt>
                        <dd>{formatDate(organization.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">
                          Last activity
                        </dt>
                        <dd>
                          {organization.lastActivityAt
                            ? formatDate(organization.lastActivityAt)
                            : "Unavailable"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-slate-500">
                          Organization ID
                        </dt>
                        <dd className="font-mono text-xs break-all">
                          {organization.id}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex items-center gap-4 border-t border-slate-100 pt-3">
                      <Link
                        href={`/internal/admin/organizations/${organization.id}`}
                        className="text-sm font-semibold text-slate-800 hover:underline"
                      >
                        View details
                      </Link>
                      <CopyIdButton id={organization.id} label="Copy ID" />
                    </div>
                  </details>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[72rem] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    {[
                      "Organization",
                      "Plan",
                      "Status",
                      "Members",
                      "Active projects",
                      "Created",
                      "Last activity",
                      "Issues",
                      "Actions",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {organizations.items.map((organization) => (
                    <tr
                      key={organization.id}
                      className="align-top hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/internal/admin/organizations/${organization.id}`}
                          className="font-semibold text-slate-950 hover:underline"
                        >
                          {organization.name}
                        </Link>
                        <p className="mt-1 max-w-56 truncate font-mono text-xs text-slate-500">
                          {organization.id}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <UnavailableValue />
                      </td>
                      <td className="px-4 py-4">
                        <AdminStatusBadge status={organization.status} />
                      </td>
                      <td className="px-4 py-4">{organization.memberCount}</td>
                      <td className="px-4 py-4">
                        {organization.activeProjectCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {formatDate(organization.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {organization.lastActivityAt ? (
                          formatDate(organization.lastActivityAt)
                        ) : (
                          <UnavailableValue />
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {organization.hasOperationalIssues ? (
                          <span className="font-semibold text-amber-800">
                            Needs review
                          </span>
                        ) : (
                          <span className="text-slate-500">No signal</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <details className="relative">
                          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                            Actions
                          </summary>
                          <div className="mt-2 flex min-w-28 flex-col items-start gap-2">
                            <Link
                              href={`/internal/admin/organizations/${organization.id}`}
                              className="text-xs font-semibold text-slate-700 hover:underline"
                            >
                              View details
                            </Link>
                            <CopyIdButton
                              id={organization.id}
                              label="Copy ID"
                            />
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-10 text-center">
            <h2 className="font-semibold">
              {input.query
                ? "No matching organizations"
                : "No organizations yet"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {input.query
                ? "Adjust the search or filters and try again."
                : "Customer organizations will appear here after creation."}
            </p>
          </div>
        )}
        <DirectoryPagination
          path="/internal/admin/organizations"
          params={params}
          page={organizations.page}
          pageCount={organizations.pageCount}
        />
      </section>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string | number;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <select
        name={name}
        defaultValue={String(value)}
        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal"
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
