import { toCsv } from "@/features/data-exports/archive";
import type { toAuditLogView } from "@/features/audit/view";

export type AuditLogView = ReturnType<typeof toAuditLogView>;
export type AuditLogFilters = Readonly<{
  q?: string;
  outcome?: string;
  action?: string;
}>;

export function filterAuditRecords(
  records: readonly AuditLogView[],
  filters: AuditLogFilters,
) {
  const query = filters.q?.trim().toLowerCase() ?? "";
  return records.filter(
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
}

export function buildAuditLogCsv(records: readonly AuditLogView[]) {
  return toCsv(
    records.map((record) => ({
      occurred_at: record.occurredAt,
      action: record.action,
      actor: record.actor,
      actor_auth_user_id: record.actorAuthUserId,
      actor_user_id: record.actorUserId,
      resource_type: record.resourceType,
      resource_id: record.resourceId,
      outcome: record.outcome,
      ip_address: record.ipAddress,
      correlation_id: record.correlationId,
      metadata: record.metadata,
    })),
  );
}

export function auditExportHref(filters: AuditLogFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") params.set(key, value);
  }
  const query = params.toString();
  return `/api/audit-log/export${query ? `?${query}` : ""}`;
}
