"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import {
  hasPlatformPermission,
  requirePlatformOperator,
  requirePlatformPermission,
} from "@/features/platform-admin/authorization";
import { searchPlatformDirectory } from "@/features/platform-admin/search";

export type PlatformSearchState = Readonly<{
  query: string;
  error?: string;
  results: readonly Readonly<{
    id: string;
    type: "organization" | "user";
    title: string;
    subtitle: string;
  }>[];
}>;

export async function searchPlatformAction(
  _state: PlatformSearchState,
  formData: FormData,
): Promise<PlatformSearchState> {
  const parsed = z.string().trim().min(2).max(120).safeParse(formData.get("q"));
  if (!parsed.success) {
    return {
      query: "",
      error: "Enter at least two characters.",
      results: [],
    };
  }
  const operator = await requirePlatformOperator();
  const scope = {
    organizations: hasPlatformPermission(
      operator,
      "platform.organizations.read",
    ),
    users: hasPlatformPermission(operator, "platform.users.read"),
  };
  if (!scope.organizations && !scope.users) {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.directory.searched",
      resourceType: "platform_directory",
      outcome: "denied",
    });
    notFound();
  }
  const results = await searchPlatformDirectory(parsed.data, scope);
  await recordPlatformAuditEvent({
    operator,
    action: "platform.directory.searched",
    resourceType: "platform_directory",
    metadata: { queryLength: parsed.data.length, resultCount: results.length },
  });
  return { query: parsed.data, results };
}

export async function refreshAdminViewAction() {
  const operator = await requirePlatformPermission(
    "platform.dashboard.read",
    "admin_dashboard",
    "overview",
  );
  await recordPlatformAuditEvent({
    operator,
    action: "platform.dashboard.refreshed",
    resourceType: "admin_dashboard",
    resourceId: "overview",
  });
  revalidatePath("/internal/admin", "layout");
}
