import Link from "next/link";

import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { CustomerHealthRepository } from "@/features/platform-admin/customer-health-repository";
import type { CustomerHealthStatus } from "@/features/platform-admin/customer-health-types";
import { customerHealthListInputSchema } from "@/features/platform-admin/customer-health-validation";
import { DirectoryPagination } from "@/features/platform-admin/customer-directory-ui";
import {
  firstParam,
  preservedParams,
  type RawSearchParams,
} from "@/features/platform-admin/directory-params";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CustomerHealthPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requirePlatformPermission(
    "platform.organizations.read",
    "admin_page",
    "customer_health",
  );
  const raw = await searchParams;
  const input = customerHealthListInputSchema.parse({
    query: firstParam(raw, "q") ?? "",
    status: firstParam(raw, "status"),
    sort: firstParam(raw, "sort"),
    page: firstParam(raw, "page"),
    pageSize: firstParam(raw, "size"),
  });
  const repository = new CustomerHealthRepository(createAdminSupabaseClient());
  const [health, counts] = await Promise.all([
    repository.list(input),
    repository.counts(),
  ]);
  const params = preservedParams(raw);

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7">
      <div>
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
          Customer operations
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Customer health
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Content-free indicators for login recency, onboarding, job
          reliability, feature adoption, and organization activity.
        </p>
      </div>

      <section
        aria-label="Customer health summary"
        className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric label="Organizations" value={counts.total} />
        <Metric label="Healthy" value={counts.healthy} tone="healthy" />
        <Metric label="Watch" value={counts.watch} tone="watch" />
        <Metric
          label="Needs attention"
          value={counts.needsAttention}
          tone="attention"
        />
      </section>

      <form className="border-border mt-5 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,auto))]">
        <label className="text-xs font-semibold text-slate-600">
          Search
          <input
            name="q"
            type="search"
            defaultValue={input.query}
            placeholder="Organization name or exact ID"
            className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal"
          />
        </label>
        <Select
          name="status"
          label="Health"
          value={input.status}
          options={[
            ["all", "All health states"],
            ["healthy", "Healthy"],
            ["watch", "Watch"],
            ["needs_attention", "Needs attention"],
          ]}
        />
        <Select
          name="sort"
          label="Sort"
          value={input.sort}
          options={[
            ["health", "Health state"],
            ["login", "Login recency"],
            ["activity", "Recent activity"],
            ["onboarding", "Onboarding"],
            ["adoption", "Feature adoption"],
            ["jobs", "Job failures"],
          ]}
        />
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Apply
          </button>
          <Link
            href="/internal/admin/customer-health"
            className="grid min-h-10 place-items-center rounded-md border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      <section className="border-border mt-5 overflow-hidden rounded-lg border bg-white shadow-sm">
        {health.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[78rem] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  {[
                    "Organization",
                    "Health",
                    "Last login",
                    "Onboarding",
                    "Feature adoption",
                    "Job failures (30d)",
                    "Activity (30d)",
                    "Last activity",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {health.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <Link
                        href={`/internal/admin/organizations/${item.id}`}
                        className="font-semibold hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {item.slug}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <HealthBadge status={item.healthStatus} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {dateOrNever(item.lastLoginAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Progress
                        value={item.onboardingCompletionPercent}
                        label={`${item.onboardingCompletionPercent}%`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Progress
                        value={item.featureAdoptionPercent}
                        label={`${item.adoptedFeatureCount}/${item.availableFeatureCount} core features`}
                      />
                    </td>
                    <td className="px-4 py-4">{item.jobFailures30d}</td>
                    <td className="px-4 py-4">{item.activityEvents30d}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {dateOrNever(item.lastActivityAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <h2 className="font-semibold">No matching organizations</h2>
            <p className="mt-2 text-sm text-slate-500">
              Adjust the filters and try again.
            </p>
          </div>
        )}
        <DirectoryPagination
          path="/internal/admin/customer-health"
          params={params}
          page={health.page}
          pageCount={health.pageCount}
        />
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "healthy" | "watch" | "attention";
}) {
  const colors = {
    default: "border-slate-200",
    healthy: "border-emerald-200",
    watch: "border-amber-200",
    attention: "border-red-200",
  }[tone];
  return (
    <div className={`rounded-lg border bg-white p-4 ${colors}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function HealthBadge({ status }: { status: CustomerHealthStatus }) {
  const style = {
    healthy: "bg-emerald-50 text-emerald-800",
    watch: "bg-amber-50 text-amber-800",
    needs_attention: "bg-red-50 text-red-800",
  }[status];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {status === "needs_attention"
        ? "Needs attention"
        : status[0]?.toUpperCase() + status.slice(1)}
    </span>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-32">
      <p className="font-semibold">{label}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function dateOrNever(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Never";
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
