"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import {
  hasPlatformPermission,
  requirePlatformOperator,
  requirePlatformPermission,
} from "@/features/platform-admin/authorization";
import { CustomerDirectoryRepository } from "@/features/platform-admin/customer-directory-repository";
import {
  normalizedHash,
  ProductionDirectorySearchService,
  searchType,
} from "@/features/platform-admin/customer-directory-service";
import { globalDirectoryQuerySchema } from "@/features/platform-admin/customer-directory-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type PlatformSearchState = Readonly<{
  query: string;
  error?: string;
  results: readonly Readonly<{
    id: string;
    type: "organization" | "user";
    title: string;
    subtitle: string;
    href: string;
    status: string;
  }>[];
}>;

export async function searchPlatformAction(
  _state: PlatformSearchState,
  formData: FormData,
): Promise<PlatformSearchState> {
  void _state;
  const operator = await requirePlatformOperator();
  const rawQuery = formData.get("q")?.toString() ?? "";
  const parsed = globalDirectoryQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.customer.search",
      resourceType: "customer_directory",
      outcome: "failed",
      metadata: {
        reason: "invalid_query",
        queryLength: rawQuery.trim().length,
      },
    });
    return {
      query: "",
      error: "Enter at least two characters.",
      results: [],
    };
  }
  if (
    !hasPlatformPermission(operator, "platform.organizations.read") &&
    !hasPlatformPermission(operator, "platform.users.read")
  )
    notFound();
  let results;
  try {
    results = await new ProductionDirectorySearchService(
      new CustomerDirectoryRepository(createAdminSupabaseClient()),
    ).search(operator, parsed.data);
  } catch (error) {
    await recordPlatformAuditEvent({
      operator,
      action: "platform.customer.search",
      resourceType: "customer_directory",
      outcome: "failed",
      metadata: {
        reason: "data_access_failure",
        searchType: searchType(parsed.data),
        queryHash: normalizedHash(parsed.data),
        queryLength: parsed.data.length,
      },
    });
    throw error;
  }
  await recordPlatformAuditEvent({
    operator,
    action: "platform.customer.search",
    resourceType: "customer_directory",
    metadata: {
      searchType: searchType(parsed.data),
      queryHash: normalizedHash(parsed.data),
      queryLength: parsed.data.length,
      resultCount: results.length,
    },
  });
  return {
    query: parsed.data,
    results: results.map((result) =>
      result.type === "organization"
        ? {
            id: result.organization.id,
            type: result.type,
            title: result.organization.name,
            subtitle: `${result.organization.id} · ${result.organization.memberCount} members · ${result.organization.lastActivityAt ? `active ${new Date(result.organization.lastActivityAt).toLocaleDateString()}` : "activity unavailable"}`,
            href: `/internal/admin/organizations/${result.organization.id}`,
            status: result.organization.status,
          }
        : {
            id: result.user.id,
            type: result.type,
            title: result.user.fullName,
            subtitle: `${result.user.email ?? "Email unavailable"} · ${result.user.id} · ${result.user.membershipCount} memberships · ${result.user.lastLoginAt ? `login ${new Date(result.user.lastLoginAt).toLocaleDateString()}` : "login unavailable"}`,
            href: `/internal/admin/users/${result.user.id}`,
            status: result.user.status,
          },
    ),
  };
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
