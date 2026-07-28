import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  safeUuid,
  sanitizeMetadata,
  sanitizeText,
} from "@/features/observability/sanitize";

export type ErrorSource = "client" | "server" | "api" | "background_job";

export type ReportErrorInput = {
  error: unknown;
  source: ErrorSource;
  headers?: Headers;
  requestPath?: string;
  requestMethod?: string;
  organizationId?: string | null;
  applicationUserId?: string | null;
  authUserId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function reportError(input: ReportErrorInput): Promise<void> {
  try {
    const error =
      input.error instanceof Error
        ? input.error
        : new Error(String(input.error ?? "Unknown error"));
    const headers = input.headers;
    const requestId =
      safeUuid(headers?.get("x-request-id") ?? null) ?? crypto.randomUUID();
    const correlationId =
      safeUuid(headers?.get("x-correlation-id") ?? null) ?? requestId;
    const { error: insertError } = await createAdminSupabaseClient()
      .from("application_error_reports")
      .insert({
        source: input.source,
        severity: "error",
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "local",
        application_version:
          process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 40) ?? "local",
        error_name: sanitizeText(error.name, 120),
        error_message: sanitizeText(error.message),
        stack_trace: error.stack ? sanitizeText(error.stack, 8_000) : null,
        request_path: input.requestPath
          ? sanitizeText(input.requestPath.split("?")[0] ?? "", 500)
          : null,
        request_method: input.requestMethod?.slice(0, 10) ?? null,
        request_id: requestId,
        correlation_id: correlationId,
        auth_user_id: safeUuid(input.authUserId ?? null),
        organization_id: safeUuid(input.organizationId ?? null),
        application_user_id: safeUuid(input.applicationUserId ?? null),
        user_agent: headers?.get("user-agent")
          ? sanitizeText(headers.get("user-agent") ?? "", 500)
          : null,
        browser_context: sanitizeMetadata({
          browser:
            input.metadata && "browser" in input.metadata
              ? input.metadata.browser
              : undefined,
        }) as Json,
        safe_metadata: sanitizeMetadata(input.metadata) as Json,
        occurred_at: new Date().toISOString(),
      });
    if (insertError)
      console.error("[observability] error report persistence failed");
  } catch {
    console.error("[observability] error report capture failed");
  }
}
