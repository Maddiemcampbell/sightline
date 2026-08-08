import { getAuditLogViewer } from "@/features/audit/data";
import {
  buildAuditLogCsv,
  filterAuditRecords,
  type AuditLogFilters,
} from "@/features/audit/export";
import { recordAuditEvent } from "@/features/audit/service";
import { canViewAuditLogs } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";

const MAX_EXPORT_RECORDS = 250;

function unavailable() {
  return Response.json(
    { error: "Audit log not found." },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(request: Request) {
  const context = await requireActorContext();
  if (!canViewAuditLogs(context)) return unavailable();
  const url = new URL(request.url);
  const filters: AuditLogFilters = Object.fromEntries(
    ["q", "outcome", "action"].flatMap((key) => {
      const value = url.searchParams.get(key);
      return value ? [[key, value]] : [];
    }),
  );
  const records = filterAuditRecords(
    await getAuditLogViewer(MAX_EXPORT_RECORDS),
    filters,
  );
  const csv = buildAuditLogCsv(records);
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "audit_log.exported",
    resourceType: "organization_audit_log",
    resourceId: context.organizationId,
    metadata: {
      records: records.length,
      filtered: Object.values(filters).some(
        (value) => Boolean(value) && value !== "all",
      ),
    },
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="sightline-audit-log-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
