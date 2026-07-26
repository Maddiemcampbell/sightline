import "server-only";

import { OrganizationRepository } from "@/features/organizations/repository";
import type { RequestPrincipal } from "@/lib/auth/session";
import {
  destinationForMembershipState,
  onboardingNext,
} from "@/lib/auth/onboarding-policy";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type OnboardingResolution = Readonly<{
  destination: string;
  organizationId: string | null;
}>;

export async function resolveOnboardingDestination(
  principal: RequestPrincipal,
  options: Readonly<{
    next?: string | null;
    preferredOrganizationId?: string | null;
    welcome?: "signup" | "organization" | "invitation";
  }> = {},
): Promise<OnboardingResolution> {
  if (!principal.emailVerified) {
    const next = onboardingNext(options.next);
    return {
      destination: `/verify-email${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      organizationId: null,
    };
  }

  const requested = onboardingNext(options.next);
  if (
    requested === "/reset-password" ||
    requested?.startsWith("/invitations/")
  ) {
    return { destination: requested, organizationId: null };
  }

  const client = createAdminSupabaseClient();
  const memberships = await new OrganizationRepository(client).listMemberships(
    principal.id,
  );
  if (!memberships.length) {
    return {
      destination: destinationForMembershipState({
        organizationId: null,
        projectCount: 0,
        next: requested,
      }),
      organizationId: null,
    };
  }

  const membership =
    memberships.find(
      (item) => item.organizationId === options.preferredOrganizationId,
    ) ?? memberships[0]!;

  let projectCount = 1;
  if (!requested) {
    const { count, error } = await client
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organizationId);
    if (error) throw new Error(error.message);
    projectCount = count ?? 0;
  }

  return {
    destination: destinationForMembershipState({
      organizationId: membership.organizationId,
      projectCount,
      next: requested,
      ...(options.welcome === undefined ? {} : { welcome: options.welcome }),
    }),
    organizationId: membership.organizationId,
  };
}
