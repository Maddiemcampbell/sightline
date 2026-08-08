import { describe, expect, it } from "vitest";

import {
  auditExportHref,
  buildAuditLogCsv,
  filterAuditRecords,
  type AuditLogView,
} from "./export";

const records: AuditLogView[] = [
  {
    id: "log-1",
    action: "document.downloaded",
    actionLabel: "document downloaded",
    actor: '=HYPERLINK("https://invalid.example")',
    actorAuthUserId: "auth-1",
    actorUserId: "user-1",
    resourceType: "document",
    resourceId: "document-1",
    outcome: "success",
    ipAddress: "203.0.113.8",
    correlationId: "correlation-1",
    metadata: { source: "settings" },
    occurredAt: "2026-08-07T12:00:00.000Z",
  },
  {
    id: "log-2",
    action: "member.invited",
    actionLabel: "member invited",
    actor: "Alex Rivera",
    actorAuthUserId: "auth-2",
    actorUserId: "user-2",
    resourceType: "organization_membership",
    resourceId: "member-1",
    outcome: "denied",
    ipAddress: null,
    correlationId: "correlation-2",
    metadata: {},
    occurredAt: "2026-08-07T11:00:00.000Z",
  },
];

describe("audit log export", () => {
  it("applies the same query, action, and outcome filters as the viewer", () => {
    expect(
      filterAuditRecords(records, {
        q: "alex",
        action: "member.invited",
        outcome: "denied",
      }),
    ).toEqual([records[1]]);
    expect(filterAuditRecords(records, { outcome: "all" })).toEqual(records);
  });

  it("exports traceability fields and prevents spreadsheet formula execution", () => {
    const csv = buildAuditLogCsv(records.slice(0, 1));

    expect(csv).toContain('"correlation_id"');
    expect(csv).toContain('"metadata"');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"203.0.113.8"');
  });

  it("preserves active filters in the download URL", () => {
    expect(
      auditExportHref({ q: "member invite", outcome: "denied", action: "all" }),
    ).toBe("/api/audit-log/export?q=member+invite&outcome=denied");
  });
});
