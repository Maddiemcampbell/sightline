import Link from "next/link";

import { FeatureRequestAdminRepository } from "@/features/feature-requests/repository";
import {
  FEATURE_REQUEST_PRIORITIES,
  FEATURE_REQUEST_STATUSES,
} from "@/features/feature-requests/types";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function FeatureRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission(
    "platform.support.read",
    "feature_request",
    "list",
  );
  const params = await searchParams;
  const value = (key: string) =>
    typeof params[key] === "string" ? params[key] : undefined;
  const status = FEATURE_REQUEST_STATUSES.find(
    (item) => item === value("status"),
  );
  const priority = FEATURE_REQUEST_PRIORITIES.find(
    (item) => item === value("priority"),
  );
  const order = ["newest", "oldest", "priority"].find(
    (item) => item === value("order"),
  ) as "newest" | "oldest" | "priority" | undefined;
  const requests = await new FeatureRequestAdminRepository(
    createAdminSupabaseClient(),
  ).list({
    ...(value("q") ? { search: value("q") } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(value("organization") ? { organizationId: value("organization") } : {}),
    ...(order ? { order } : {}),
  });
  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
          Customer support
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Feature requests</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ideas submitted from customer workspaces.
        </p>
      </header>
      <form className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={value("q")}
          placeholder="Search title or request ID"
          className="min-h-11 rounded-md border px-3 sm:col-span-2"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="min-h-11 rounded-md border px-3"
        >
          <option value="">All statuses</option>
          {FEATURE_REQUEST_STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          name="priority"
          defaultValue={priority ?? ""}
          className="min-h-11 rounded-md border px-3"
        >
          <option value="">All priorities</option>
          {FEATURE_REQUEST_PRIORITIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          name="order"
          defaultValue={order ?? "newest"}
          className="min-h-11 rounded-md border px-3"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="priority">Priority</option>
        </select>
        <input
          name="organization"
          defaultValue={value("organization")}
          placeholder="Organization ID"
          className="min-h-11 rounded-md border px-3 sm:col-span-2"
        />
        <button className="min-h-11 rounded-md bg-slate-900 px-4 font-semibold text-white">
          Apply filters
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-3">Request</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Status</th>
              <th className="p-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b last:border-0">
                <td className="p-3">
                  <Link
                    href={`/internal/admin/feature-requests/${request.id}`}
                    className="font-semibold hover:underline"
                  >
                    {request.title}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {request.id}
                  </p>
                </td>
                <td className="p-3 capitalize">
                  {request.customer_priority ?? "Not specified"}
                </td>
                <td className="p-3 capitalize">
                  {request.status.replaceAll("_", " ")}
                </td>
                <td className="p-3">
                  {new Date(request.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!requests.length ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No feature requests match these filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}
