import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";

import type { Json } from "@/lib/supabase/database.types";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "invitation.created"
  | "invitation.accepted"
  | "organization.created"
  | "organization.updated"
  | "membership.created"
  | "membership.deleted"
  | "authorization.permission_changed"
  | "document.downloaded"
  | "ai.configuration_changed"
  | "ai.review_updated"
  | "settings.updated";

export type AuditRequestContext = Readonly<{
  ipAddress: string | null;
  correlationId: string;
}>;

export type AuditEvent = Readonly<{
  organizationId: string | null;
  actorAuthUserId: string | null;
  actorUserId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  outcome?: "success" | "denied" | "failed";
  metadata?: Json;
}>;

export type AuditInsert = Readonly<{
  organizationId: string | null;
  actorAuthUserId: string | null;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: "success" | "denied" | "failed";
  metadata: Json;
  ipAddress: string | null;
  correlationId: string;
}>;

export interface AuditWriter {
  append(event: AuditInsert): Promise<void>;
}

export class AuditService {
  constructor(private readonly repository: AuditWriter) {}

  async record(event: AuditEvent, request: AuditRequestContext): Promise<void> {
    await this.repository.append({
      organizationId: event.organizationId,
      actorAuthUserId: event.actorAuthUserId,
      actorUserId: event.actorUserId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId ?? null,
      outcome: event.outcome ?? "success",
      metadata: event.metadata ?? {},
      ipAddress: request.ipAddress,
      correlationId: request.correlationId,
    });
  }
}

export function auditIdentifier(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function auditRequestContext(
  requestHeaders: Headers,
): AuditRequestContext {
  const forwarded = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const candidate = forwarded || requestHeaders.get("x-real-ip")?.trim() || "";
  const requestedCorrelation =
    requestHeaders.get("x-correlation-id") ??
    requestHeaders.get("x-request-id") ??
    "";
  return {
    ipAddress: isIP(candidate) ? candidate : null,
    correlationId: isUuid(requestedCorrelation)
      ? requestedCorrelation.toLowerCase()
      : randomUUID(),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
