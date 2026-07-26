import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { platformCan } from "@/features/platform-admin/capabilities";
import { PlatformOperatorRepository } from "@/features/platform-admin/repository";
import type {
  PlatformOperator,
  PlatformPermission,
} from "@/features/platform-admin/types";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const getCurrentPlatformOperator = cache(
  async (): Promise<PlatformOperator | null> => {
    const principal = await requireAuthenticatedUser(
      "/login?next=%2Finternal%2Fadmin",
    );
    return new PlatformOperatorRepository(
      createAdminSupabaseClient(),
    ).findActiveByAuthUserId(principal.id);
  },
);

export async function requirePlatformOperator() {
  const operator = await getCurrentPlatformOperator();
  if (!operator) notFound();
  return operator;
}

export async function requirePlatformPermission(
  permission: PlatformPermission,
  resourceType = "admin_page",
  resourceId: string = permission,
) {
  const operator = await requirePlatformOperator();
  const allowed = platformCan(operator, permission);
  await recordPlatformAuditEvent({
    operator,
    action: pageAuditAction(permission),
    resourceType,
    resourceId,
    outcome: allowed ? "success" : "denied",
    metadata: { permission },
  });
  if (!allowed) notFound();
  return operator;
}

export function hasPlatformPermission(
  operator: PlatformOperator,
  permission: PlatformPermission,
) {
  return platformCan(operator, permission);
}

function pageAuditAction(permission: PlatformPermission) {
  const actions: Partial<Record<PlatformPermission, string>> = {
    "platform.organizations.read": "platform.organizations.viewed",
    "platform.users.read": "platform.users.viewed",
    "platform.audit.read": "platform.audit.viewed",
    "platform.jobs.read": "platform.jobs.viewed",
    "platform.ai.read": "platform.ai_usage.viewed",
    "platform.health.read": "platform.health.viewed",
    "platform.support.read": "platform.support.viewed",
  };
  return actions[permission] ?? "platform.page.viewed";
}
