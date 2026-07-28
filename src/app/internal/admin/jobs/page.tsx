import Link from "next/link";

import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { JobDashboardAutoRefresh } from "@/features/job-monitoring/auto-refresh";
import { getJobDashboard } from "@/features/job-monitoring/dashboard";
import { triggerSchedulerJobAction } from "./actions";

export default async function PlatformJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission("platform.jobs.read", "admin_page", "jobs");
  const dashboard = await getJobDashboard(await searchParams);
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
            Platform Operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Background jobs</h1>
          <p className="mt-2 text-sm text-slate-600">
            Scheduled execution health, retries, and recent failures.
          </p>
        </div>
        <JobDashboardAutoRefresh />
      </div>
      <form className="mt-7 flex flex-wrap gap-3" aria-label="Job filters">
        <select
          name="status"
          defaultValue={dashboard.query.status}
          className="rounded-md border px-3 py-2"
          aria-label="Status"
        >
          {["all", "queued", "running", "succeeded", "failed", "unhealthy"].map(
            (status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ),
          )}
        </select>
        <select
          name="sort"
          defaultValue={dashboard.query.sort}
          className="rounded-md border px-3 py-2"
          aria-label="Sort"
        >
          <option value="last_failure">Last failure</option>
          <option value="last_success">Last success</option>
          <option value="job">Job name</option>
          <option value="status">Status</option>
          <option value="duration">Duration</option>
          <option value="failures">Failure count</option>
        </select>
        <select
          name="order"
          defaultValue={dashboard.query.order}
          className="rounded-md border px-3 py-2"
          aria-label="Order"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-white">
          Apply
        </button>
      </form>
      <section
        className="mt-5 rounded-lg border bg-white p-4"
        aria-labelledby="manual-jobs-title"
      >
        <h2 id="manual-jobs-title" className="text-sm font-semibold">
          Manual execution
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Manual runs use the scheduled execution path and concurrency locks.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["risk-detection", "Risk detection"],
            ["portfolio-refresh", "Portfolio refresh"],
            ["daily-brief", "Daily Brief"],
            ["privacy-cleanup", "Privacy cleanup"],
            ["customer-data-exports", "Data exports"],
          ].map(([key, label]) => (
            <form key={key} action={triggerSchedulerJobAction}>
              <input type="hidden" name="jobKey" value={key} />
              <button className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-slate-50">
                Run {label}
              </button>
            </form>
          ))}
        </div>
      </section>
      <section
        className="mt-5 overflow-x-auto rounded-lg border bg-white"
        aria-label="Job monitoring results"
      >
        {dashboard.rows.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="font-semibold">No job executions found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Executions will appear after a scheduled or manual job runs.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[70rem] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                {[
                  "Job",
                  "Status",
                  "Last success",
                  "Last failure",
                  "Duration",
                  "Next run",
                  "Failures",
                  "Retries",
                  "Recent history",
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.rows.map((row) => (
                <tr key={row.key} className="border-b align-top">
                  <td className="px-4 py-4 font-medium">
                    {row.jobName}
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      {row.organizationName}
                    </span>
                  </td>
                  <td className="px-4 py-4 capitalize">{row.status}</td>
                  <td className="px-4 py-4">{formatDate(row.lastSuccess)}</td>
                  <td className="px-4 py-4">{formatDate(row.lastFailure)}</td>
                  <td className="px-4 py-4">
                    {row.durationMs === null
                      ? "—"
                      : `${(row.durationMs / 1000).toFixed(1)}s`}
                  </td>
                  <td className="px-4 py-4">{formatDate(row.nextRun)}</td>
                  <td className="px-4 py-4">{row.failureCount}</td>
                  <td className="px-4 py-4">{row.retryCount}</td>
                  <td className="px-4 py-4">
                    {row.history.map((item) => (
                      <span
                        key={item.id}
                        className="mr-2 inline-block capitalize"
                      >
                        {item.status}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <nav
        className="mt-5 flex justify-between text-sm"
        aria-label="Pagination"
      >
        {dashboard.query.page > 1 ? (
          <Link
            href={`?status=${dashboard.query.status}&sort=${dashboard.query.sort}&order=${dashboard.query.order}&page=${dashboard.query.page - 1}`}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {dashboard.query.page} of {dashboard.pageCount} ·{" "}
          {dashboard.total} jobs
        </span>
        {dashboard.query.page < dashboard.pageCount ? (
          <Link
            href={`?status=${dashboard.query.status}&sort=${dashboard.query.sort}&order=${dashboard.query.order}&page=${dashboard.query.page + 1}`}
          >
            Next
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
