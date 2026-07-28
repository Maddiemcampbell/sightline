import {
  AdminPageHeader,
  EmptyTable,
  formatDateTime,
  Pagination,
  StatusPill,
} from "@/features/platform-admin/data-ui";
import Link from "next/link";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;
const sources = ["client", "server", "api", "background_job"] as const;
const severities = ["warning", "error", "fatal"] as const;

export default async function PlatformErrorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission(
    "platform.support.read",
    "admin_page",
    "errors",
  );
  const raw = await searchParams;
  const get = (key: string) =>
    typeof raw[key] === "string" ? raw[key] : undefined;
  const page = Math.max(1, Number.parseInt(get("page") ?? "1", 10) || 1);
  const source = sources.find((value) => value === get("source"));
  const severity = severities.find((value) => value === get("severity"));
  const environment = (get("environment") ?? "").slice(0, 80);
  const queryText = (get("q") ?? "").trim().slice(0, 120);
  let query = createAdminSupabaseClient()
    .from("application_error_reports")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (source) query = query.eq("source", source);
  if (severity) query = query.eq("severity", severity);
  if (environment) query = query.eq("environment", environment);
  if (queryText) {
    const search = escapeSearch(queryText);
    query = query.or(
      validUuid(queryText)
        ? `error_name.ilike.%${search}%,error_message.ilike.%${search}%,correlation_id.eq.${queryText}`
        : `error_name.ilike.%${search}%,error_message.ilike.%${search}%`,
    );
  }
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (severity) params.set("severity", severity);
  if (environment) params.set("environment", environment);
  if (queryText) params.set("q", queryText);
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        eyebrow="Observability"
        title="Production errors"
        description="Redacted application failures with correlation and request context. Request bodies, secrets, tokens, and raw documents are never stored here."
      />
      <form
        aria-label="Error filters"
        className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-5"
      >
        <input
          name="q"
          defaultValue={queryText}
          placeholder="Error, message, or correlation ID"
          className="min-h-11 rounded-md border px-3 sm:col-span-2"
        />
        <select
          name="source"
          aria-label="Source"
          defaultValue={source ?? ""}
          className="min-h-11 rounded-md border px-3"
        >
          <option value="">All sources</option>
          {sources.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          name="severity"
          aria-label="Severity"
          defaultValue={severity ?? ""}
          className="min-h-11 rounded-md border px-3"
        >
          <option value="">All severities</option>
          {severities.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <button className="min-h-11 rounded-md bg-slate-900 px-4 font-semibold text-white">
          Apply filters
        </button>
      </form>
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[70rem] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-3">Error</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Source</th>
                <th className="p-3">Request</th>
                <th className="p-3">Correlation ID</th>
                <th className="p-3">Occurred</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((report) => (
                <tr
                  key={report.id}
                  className="border-b align-top last:border-0"
                >
                  <td className="max-w-md p-3">
                    <Link
                      href={`/internal/admin/errors/${report.id}`}
                      className="font-semibold hover:underline"
                    >
                      {report.error_name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {report.error_message}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {report.application_version} · {report.environment}
                    </p>
                  </td>
                  <td className="p-3">
                    <StatusPill value={report.severity} />
                  </td>
                  <td className="p-3 capitalize">
                    {report.source.replaceAll("_", " ")}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {report.request_method ?? "—"} {report.request_path ?? "—"}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {report.correlation_id}
                  </td>
                  <td className="p-3">{formatDateTime(report.occurred_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.length ? (
          <EmptyTable>No errors match these filters.</EmptyTable>
        ) : null}
        <Pagination
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          path="/internal/admin/errors"
          params={params}
        />
      </div>
    </div>
  );
}

function escapeSearch(value: string) {
  return value.replaceAll("%", "").replaceAll(",", "");
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
