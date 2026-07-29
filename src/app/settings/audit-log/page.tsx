import { Card } from "@/components/ui/card";
import { getAuditLogViewer } from "@/features/audit/data";

export const dynamic = "force-dynamic";

export default async function SettingsAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; outcome?: string; action?: string }>;
}) {
  const filters = await searchParams;
  const records = await getAuditLogViewer(250);
  const query = filters.q?.trim().toLowerCase() ?? "";
  const filtered = records.filter(
    (record) =>
      (!query ||
        `${record.action} ${record.actor} ${record.resourceType} ${record.correlationId}`
          .toLowerCase()
          .includes(query)) &&
      (!filters.outcome ||
        filters.outcome === "all" ||
        record.outcome === filters.outcome) &&
      (!filters.action ||
        filters.action === "all" ||
        record.action === filters.action),
  );
  const actions = [...new Set(records.map((record) => record.action))].sort();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Audit log</h2>
        <p className="text-muted mt-2 text-sm">
          Append-only internal security events. This is separate from
          user-facing activity.
        </p>
      </div>
      <Card>
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_12rem_14rem_auto]">
          <label className="text-sm font-semibold">
            Search
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Actor, action, resource, correlation ID"
              className="border-border mt-2 min-h-10 w-full rounded-md border px-3 font-normal"
            />
          </label>
          <label className="text-sm font-semibold">
            Outcome
            <select
              name="outcome"
              defaultValue={filters.outcome ?? "all"}
              className="border-border mt-2 min-h-10 w-full rounded-md border px-3 font-normal"
            >
              <option value="all">All outcomes</option>
              <option value="success">Success</option>
              <option value="denied">Denied</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Action
            <select
              name="action"
              defaultValue={filters.action ?? "all"}
              className="border-border mt-2 min-h-10 w-full rounded-md border px-3 font-normal"
            >
              <option value="all">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>
          <button className="bg-deep-green self-end rounded-md px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </form>
        <button
          type="button"
          disabled
          title="Audit export will be introduced in a later release."
          className="text-muted mt-4 rounded-md border px-3 py-2 text-xs font-semibold disabled:opacity-60"
        >
          Export CSV — coming later
        </button>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="bg-surface-muted text-muted">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Outcome</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id} className="border-border border-t align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(record.occurredAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {record.actionLabel}
                </td>
                <td className="px-4 py-3">{record.actor}</td>
                <td className="px-4 py-3">{record.resourceType}</td>
                <td className="px-4 py-3 capitalize">{record.outcome}</td>
                <td className="px-4 py-3">
                  <details>
                    <summary className="text-deep-green cursor-pointer font-semibold">
                      View details
                    </summary>
                    <dl className="mt-3 grid gap-2 text-xs">
                      <dt className="font-semibold">IP</dt>
                      <dd>{record.ipAddress ?? "Unavailable"}</dd>
                      <dt className="font-semibold">Correlation ID</dt>
                      <dd className="font-mono">{record.correlationId}</dd>
                      <dt className="font-semibold">Metadata</dt>
                      <dd>
                        <pre className="max-w-96 overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(record.metadata, null, 2)}
                        </pre>
                      </dd>
                    </dl>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="text-muted p-8 text-center text-sm">
            No audit events match these filters.
          </p>
        )}
      </Card>
    </div>
  );
}
