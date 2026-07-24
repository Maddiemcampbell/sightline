import { Card } from "@/components/ui/card";
import { getAuditLogViewer } from "@/features/audit/data";

export const dynamic = "force-dynamic";

export default async function AuditViewerPage() {
  const records = await getAuditLogViewer();
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-10">
      <p className="text-muted text-sm font-semibold tracking-wide uppercase">
        Internal security
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
        Audit log
      </h1>
      <p className="text-muted mt-3 max-w-3xl leading-7">
        Append-only security events for the active organization. This ledger is
        separate from the user-facing activity timeline.
      </p>
      <Card className="mt-7 overflow-x-auto p-0">
        <table className="w-full min-w-[72rem] text-left text-sm">
          <thead className="bg-surface-muted text-muted">
            <tr>
              {[
                "Time",
                "Action",
                "Actor",
                "Resource",
                "IP",
                "Outcome",
                "Correlation ID",
                "Metadata",
              ].map((label) => (
                <th key={label} className="px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-border border-t align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(record.occurredAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {record.actionLabel}
                </td>
                <td className="px-4 py-3">
                  <p>{record.actor}</p>
                  <p className="text-muted mt-1 font-mono text-xs">
                    {record.actorAuthUserId ?? "anonymous/system"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{record.resourceType}</p>
                  <p className="text-muted mt-1 font-mono text-xs">
                    {record.resourceId ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {record.ipAddress ?? "Unavailable"}
                </td>
                <td className="px-4 py-3 capitalize">{record.outcome}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {record.correlationId}
                </td>
                <td className="max-w-80 px-4 py-3">
                  <pre className="text-muted overflow-x-auto text-xs whitespace-pre-wrap">
                    {JSON.stringify(record.metadata)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length ? (
          <p className="text-muted p-6 text-sm">
            No audit records have been captured for this organization.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
