import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";

export type PlanKey = "essential" | "professional";

const PLANS = {
  essential: {
    name: "Essential",
    maxProjects: 5,
    maxOrganizationsPerUser: 1,
    organizationSwitchingEnabled: false,
  },
  professional: {
    name: "Professional",
    maxProjects: 10,
    maxOrganizationsPerUser: 1,
    organizationSwitchingEnabled: false,
  },
} as const;

export function planEntitlements(planKey: PlanKey) {
  return { planKey, ...PLANS[planKey] };
}

export async function getOrganizationCapacity(
  client: SupabaseClient<AppDatabase>,
  organizationId: string,
) {
  const [organizationResult, projectsResult] = await Promise.all([
    client
      .from("organizations")
      .select("plan_key")
      .eq("id", organizationId)
      .single(),
    client
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null),
  ]);
  if (organizationResult.error)
    throw new Error(organizationResult.error.message);
  if (projectsResult.error) throw new Error(projectsResult.error.message);
  const entitlements = planEntitlements(organizationResult.data.plan_key);
  const activeProjects = projectsResult.count ?? 0;
  return {
    ...entitlements,
    activeProjects,
    remainingProjects: Math.max(0, entitlements.maxProjects - activeProjects),
    atProjectLimit: activeProjects >= entitlements.maxProjects,
  };
}
