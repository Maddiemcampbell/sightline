import Link from "next/link";

import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { JobDashboardAutoRefresh } from "@/features/job-monitoring/auto-refresh";
import { getJobDashboard } from "@/features/job-monitoring/dashboard";
import { getExecutionHistory } from "@/features/scheduler/history";
import { triggerSchedulerJobAction } from "./actions";

export default async function PlatformJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission("platform.jobs.read", "admin_page", "jobs");
  const params = await searchParams;
  const [dashboard, history] = await Promise.all([
    getJobDashboard(params),
    getExecutionHistory(params),
  ]);
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
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {history.retryCount} retry executions
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              {history.deadLetterCount} dead-lettered
            </span>
          </div>
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
          <>
            <div
              className="divide-y divide-slate-100 md:hidden"
              aria-label="Job monitoring cards"
            >
              {dashboard.rows.map((row) => (
                <article key={row.key} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold">{row.jobName}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.organizationName}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize">
                      {row.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Last success</dt>
                      <dd>{formatDate(row.lastSuccess)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Failures</dt>
                      <dd>{row.failureCount}</dd>
                    </div>
                  </dl>
                  <details className="mt-3 border-t border-slate-100 pt-3">
                    <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-slate-700">
                      Execution details
                    </summary>
                    <dl className="grid grid-cols-2 gap-3 pb-2 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Last failure</dt>
                        <dd>{formatDate(row.lastFailure)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Duration</dt>
                        <dd>
                          {row.durationMs === null
                            ? "—"
                            : `${(row.durationMs / 1000).toFixed(1)}s`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Next run</dt>
                        <dd>{formatDate(row.nextRun)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Retries</dt>
                        <dd>{row.retryCount}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-slate-500">
                          Recent history
                        </dt>
                        <dd className="capitalize">
                          {row.history.map((item) => item.status).join(", ") ||
                            "No history"}
                        </dd>
                      </div>
                    </dl>
                  </details>
                </article>
              ))}
            </div>
            <table className="hidden w-full min-w-[70rem] text-left text-sm md:table">
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
          </>
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
      <section className="mt-10" aria-labelledby="execution-history-title">
        <div>
          <h2 id="execution-history-title" className="text-xl font-semibold">
            Execution history
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Searchable status, trigger, duration, and safe error history from
            the centralized scheduler.
          </p>
        </div>
        <form
          className="mt-4 flex flex-wrap gap-3 rounded-lg border bg-white p-4"
          aria-label="Execution history filters"
        >
          <input
            name="historyQ"
            defaultValue={history.query.historyQ}
            placeholder="Search job, error, or correlation ID"
            className="min-h-10 min-w-64 flex-1 rounded-md border px-3"
          />
          <select
            name="historyStatus"
            defaultValue={history.query.historyStatus}
            aria-label="Execution status"
            className="min-h-10 rounded-md border px-3"
          >
            {[
              "all",
              "queued",
              "running",
              "succeeded",
              "failed",
              "retrying",
              "timed_out",
              "skipped",
              "dead_lettered",
            ].map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select
            name="historyTrigger"
            defaultValue={history.query.historyTrigger}
            aria-label="Trigger source"
            className="min-h-10 rounded-md border px-3"
          >
            {["all", "scheduled", "manual", "retry"].map((trigger) => (
              <option key={trigger} value={trigger}>
                {trigger}
              </option>
            ))}
          </select>
          <select
            name="historySort"
            defaultValue={history.query.historySort}
            aria-label="Execution history sort"
            className="min-h-10 rounded-md border px-3"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="duration">Longest duration</option>
          </select>
          <button className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
            Apply
          </button>
        </form>
        <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
          {history.rows.length ? (
            <>
              <div
                className="divide-y divide-slate-100 md:hidden"
                aria-label="Execution history cards"
              >
                {history.rows.map((execution) => (
                  <article key={execution.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{execution.jobName}</h3>
                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {execution.jobKey}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize">
                        {execution.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      <span className="capitalize">{execution.trigger}</span> ·{" "}
                      {formatDate(execution.startedAt ?? execution.createdAt)}
                    </p>
                    <details className="mt-3 border-t border-slate-100 pt-3">
                      <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-slate-700">
                        Execution details
                      </summary>
                      <dl className="space-y-3 pb-2 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-xs text-slate-500">Attempt</dt>
                            <dd>{execution.attemptNumber}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">Duration</dt>
                            <dd>
                              {execution.durationMs === null
                                ? "—"
                                : `${(execution.durationMs / 1000).toFixed(1)}s`}
                            </dd>
                          </div>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Error</dt>
                          <dd className="break-words text-slate-600">
                            {execution.errorMessage ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">
                            Correlation ID
                          </dt>
                          <dd className="font-mono text-xs break-all">
                            {execution.correlationId}
                          </dd>
                        </div>
                      </dl>
                    </details>
                  </article>
                ))}
              </div>
              <table className="hidden w-full min-w-[70rem] text-left text-sm md:table">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    {[
                      "Job",
                      "Status",
                      "Trigger",
                      "Attempt",
                      "Started",
                      "Duration",
                      "Error",
                      "Correlation ID",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((execution) => (
                    <tr
                      key={execution.id}
                      className="border-b align-top last:border-0"
                    >
                      <td className="px-4 py-4 font-medium">
                        {execution.jobName}
                        <span className="mt-1 block font-mono text-xs font-normal text-slate-500">
                          {execution.jobKey}
                        </span>
                      </td>
                      <td className="px-4 py-4 capitalize">
                        {execution.status.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-4 capitalize">
                        {execution.trigger}
                      </td>
                      <td className="px-4 py-4">{execution.attemptNumber}</td>
                      <td className="px-4 py-4">
                        {formatDate(execution.startedAt ?? execution.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        {execution.durationMs === null
                          ? "—"
                          : `${(execution.durationMs / 1000).toFixed(1)}s`}
                      </td>
                      <td className="max-w-sm px-4 py-4 text-slate-600">
                        {execution.errorMessage ?? "—"}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-500">
                        {execution.correlationId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="p-10 text-center">
              <h3 className="font-semibold">No execution history found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Try changing the history filters or search.
              </p>
            </div>
          )}
        </div>
        <nav
          className="mt-4 flex justify-between text-sm"
          aria-label="Execution history pagination"
        >
          {history.query.historyPage > 1 ? (
            <Link
              href={historyHref(history.query, history.query.historyPage - 1)}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {history.query.historyPage} of {history.pageCount} ·{" "}
            {history.total} executions
          </span>
          {history.query.historyPage < history.pageCount ? (
            <Link
              href={historyHref(history.query, history.query.historyPage + 1)}
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </section>
    </div>
  );
}

function historyHref(
  query: Awaited<ReturnType<typeof getExecutionHistory>>["query"],
  page: number,
) {
  const params = new URLSearchParams({
    historyQ: query.historyQ,
    historyStatus: query.historyStatus,
    historyTrigger: query.historyTrigger,
    historySort: query.historySort,
    historyPage: String(page),
  });
  return `?${params.toString()}`;
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
