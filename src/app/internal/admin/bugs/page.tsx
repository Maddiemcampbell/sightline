import Link from "next/link";

import { BUG_SEVERITIES, BUG_STATUSES } from "@/features/bug-reports/types";
import { BugReportAdminRepository } from "@/features/bug-reports/admin-repository";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function BugReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission("platform.support.read", "bug_report", "list");
  const params = await searchParams;
  const string = (key: string) =>
    typeof params[key] === "string" ? params[key] : undefined;
  const status = BUG_STATUSES.find((value) => value === string("status"));
  const severity = BUG_SEVERITIES.find(
    (value) => value === string("severity"),
  );
  const order = ["newest", "oldest", "severity"].find(
    (value) => value === string("order"),
  ) as "newest" | "oldest" | "severity" | undefined;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(string("from") ?? "")
    ? string("from")
    : undefined;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(string("to") ?? "")
    ? string("to")
    : undefined;
  const reports = await new BugReportAdminRepository(
    createAdminSupabaseClient(),
  ).list({
    ...(string("q") ? { search: string("q") } : {}),
    ...(status ? { status } : {}),
    ...(severity ? { severity } : {}),
    ...(string("organization")
      ? { organizationId: string("organization") }
      : {}),
    ...(order ? { order } : {}),
    ...(from
      ? { createdAfter: new Date(`${from}T00:00:00Z`).toISOString() }
      : {}),
    ...(to
      ? { createdBefore: new Date(`${to}T23:59:59.999Z`).toISOString() }
      : {}),
  });
  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
          Customer support
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Bug reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Privacy-safe reports submitted from customer workspaces.
        </p>
      </header>
      <form className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={string("q")}
          placeholder="Search title or report ID"
          className="min-h-11 rounded-md border px-3 sm:col-span-2"
        />
        <select name="status" defaultValue={status ?? ""} className="min-h-11 rounded-md border px-3">
          <option value="">All statuses</option>
          {BUG_STATUSES.map((value) => <option key={value}>{value}</option>)}
        </select>
        <select name="severity" defaultValue={severity ?? ""} className="min-h-11 rounded-md border px-3">
          <option value="">All severities</option>
          {BUG_SEVERITIES.map((value) => <option key={value}>{value}</option>)}
        </select>
        <select name="order" defaultValue={order ?? "newest"} className="min-h-11 rounded-md border px-3">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="severity">Severity</option>
        </select>
        <input name="organization" defaultValue={string("organization")} placeholder="Organization ID" className="min-h-11 rounded-md border px-3 sm:col-span-2" />
        <label className="text-xs font-semibold uppercase text-slate-500">From<input type="date" name="from" defaultValue={string("from")} className="mt-1 min-h-11 w-full rounded-md border px-3 text-sm font-normal text-slate-900" /></label>
        <label className="text-xs font-semibold uppercase text-slate-500">To<input type="date" name="to" defaultValue={string("to")} className="mt-1 min-h-11 w-full rounded-md border px-3 text-sm font-normal text-slate-900" /></label>
        <button className="min-h-11 rounded-md bg-slate-900 px-4 font-semibold text-white">Apply filters</button>
      </form>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Report</th><th className="p-3">Severity</th><th className="p-3">Status</th><th className="p-3">Submitted</th></tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b last:border-0">
                <td className="p-3">
                  <Link href={`/internal/admin/bugs/${report.id}`} className="font-semibold hover:underline">{report.title}</Link>
                  <p className="mt-1 font-mono text-xs text-slate-500">{report.id}</p>
                </td>
                <td className="p-3 capitalize">{report.customer_severity ?? "Not specified"}</td>
                <td className="p-3 capitalize">{report.status.replaceAll("_", " ")}</td>
                <td className="p-3">{new Date(report.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!reports.length ? <p className="p-8 text-center text-sm text-slate-500">No bug reports match these filters.</p> : null}
      </div>
    </div>
  );
}
