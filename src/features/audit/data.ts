import "server-only";

import { AuditLogRepository } from "@/features/audit/repository";
import { toAuditLogView } from "@/features/audit/view";
import {
  assertAuthorized,
  canViewAuditLogs,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuditLogViewer(limit = 100) {
  const context = await requireActorContext();
  assertAuthorized(canViewAuditLogs(context));
  const client = await createServerSupabaseClient();
  const repository = new AuditLogRepository(client);
  const [logs, usersResult] = await Promise.all([
    repository.list(context, limit),
    client
      .from("users")
      .select("id,full_name,email")
      .eq("organization_id", context.organizationId),
  ]);
  if (usersResult.error) throw new Error(usersResult.error.message);
  const users = new Map(
    (usersResult.data ?? []).map((user) => [user.id, user]),
  );
  return logs.map((log) =>
    toAuditLogView(log, users.get(log.actor_user_id ?? "")),
  );
}
