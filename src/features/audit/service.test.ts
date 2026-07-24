import { describe, expect, it, vi } from "vitest";

import {
  auditIdentifier,
  auditRequestContext,
  AuditService,
  type AuditWriter,
} from "@/features/audit/core";

describe("audit service", () => {
  it("writes a complete immutable event envelope", async () => {
    const writer: AuditWriter = {
      append: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AuditService(writer);
    await service.record(
      {
        organizationId: "10000000-0000-4000-8000-000000000001",
        actorAuthUserId: "20000000-0000-4000-8000-000000000001",
        actorUserId: "30000000-0000-4000-8000-000000000001",
        action: "document.downloaded",
        resourceType: "document",
        resourceId: "40000000-0000-4000-8000-000000000001",
        metadata: { mimeType: "application/pdf" },
      },
      {
        ipAddress: "203.0.113.10",
        correlationId: "50000000-0000-4000-8000-000000000001",
      },
    );
    expect(writer.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document.downloaded",
        outcome: "success",
        ipAddress: "203.0.113.10",
        correlationId: "50000000-0000-4000-8000-000000000001",
      }),
    );
  });

  it("accepts only valid proxy IPs and UUID correlation IDs", () => {
    const valid = auditRequestContext(
      new Headers({
        "x-forwarded-for": "203.0.113.8, 10.0.0.2",
        "x-correlation-id": "60000000-0000-4000-8000-000000000001",
      }),
    );
    expect(valid).toEqual({
      ipAddress: "203.0.113.8",
      correlationId: "60000000-0000-4000-8000-000000000001",
    });
    const invalid = auditRequestContext(
      new Headers({
        "x-forwarded-for": "attacker-controlled",
        "x-correlation-id": "not-a-uuid",
      }),
    );
    expect(invalid.ipAddress).toBeNull();
    expect(invalid.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("hashes identifiers before unauthenticated audit metadata storage", () => {
    expect(auditIdentifier(" User@Example.com ")).toBe(
      auditIdentifier("user@example.com"),
    );
    expect(auditIdentifier("user@example.com")).not.toContain("@");
  });
});
