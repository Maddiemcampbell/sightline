import "server-only";

import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

import type {
  PlatformAuditOutcome,
  PlatformOperator,
} from "@/features/platform-admin/types";
import { PlatformOperatorRepository } from "@/features/platform-admin/repository";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function recordPlatformAuditEvent(input: {
  operator: Pick<PlatformOperator, "id">;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  organizationId?: string | null;
  affectedAuthUserId?: string | null;
  outcome?: PlatformAuditOutcome;
  metadata?: Json;
}) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const candidate = forwarded || requestHeaders.get("x-real-ip")?.trim() || "";
  const requestId =
    requestHeaders.get("x-request-id") ??
    requestHeaders.get("x-correlation-id") ??
    randomUUID();
  const suppliedMetadata =
    input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? input.metadata
      : {};
  const { error } = await createAdminSupabaseClient()
    .from("platform_audit_logs")
    .insert({
      operator_id: input.operator.id,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      organization_id: input.organizationId ?? null,
      affected_auth_user_id: input.affectedAuthUserId ?? null,
      ip_address: isIP(candidate) ? candidate : null,
      user_agent: requestHeaders.get("user-agent")?.slice(0, 1000) ?? null,
      request_id: requestId.slice(0, 240),
      outcome: input.outcome ?? "success",
      metadata: {
        ...suppliedMetadata,
        environment:
          process.env.VERCEL_ENV ??
          (process.env.NODE_ENV === "production"
            ? "production"
            : "development"),
      },
    });
  if (error) throw new Error(error.message);
}

export async function recordPlatformAuthenticationEvent(
  authUserId: string,
  action: "platform.auth.login" | "platform.auth.logout",
) {
  const operator = await new PlatformOperatorRepository(
    createAdminSupabaseClient(),
  ).findActiveByAuthUserId(authUserId);
  if (!operator) return;
  await recordPlatformAuditEvent({
    operator,
    action,
    resourceType: "platform_session",
  });
  if (action === "platform.auth.login") {
    const { error } = await createAdminSupabaseClient()
      .from("platform_operators")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", operator.id);
    if (error) throw new Error(error.message);
  }
}
