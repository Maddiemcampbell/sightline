import { describe, expect, it } from "vitest";

import { toAuditLogView } from "@/features/audit/view";
import type { AuditLogRow } from "@/lib/supabase/database.types";

const log: AuditLogRow = {
  id: "10000000-0000-4000-8000-000000000001",
  organization_id: "20000000-0000-4000-8000-000000000001",
  actor_auth_user_id: "30000000-0000-4000-8000-000000000001",
  actor_user_id: "40000000-0000-4000-8000-000000000001",
  event_type: "document.downloaded",
  resource_type: "document",
  resource_id: "50000000-0000-4000-8000-000000000001",
  outcome: "success",
  metadata: {},
  ip_address: "203.0.113.8",
  correlation_id: "60000000-0000-4000-8000-000000000001",
  occurred_at: "2026-07-24T12:00:00.000Z",
  created_at: "2026-07-24T12:00:00.000Z",
};

describe("audit viewer DTO", () => {
  it("keeps audit identity and correlation fields separate from activity", () => {
    expect(
      toAuditLogView(log, {
        full_name: "Maddie Campbell",
        email: "maddie@example.com",
      }),
    ).toMatchObject({
      actionLabel: "document downloaded",
      actor: "Maddie Campbell",
      ipAddress: "203.0.113.8",
      correlationId: "60000000-0000-4000-8000-000000000001",
    });
  });

  it("does not lose records when the actor profile no longer exists", () => {
    expect(toAuditLogView(log).actor).toBe("System or former user");
  });
});
