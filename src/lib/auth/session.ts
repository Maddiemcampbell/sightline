import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { OrganizationRepository } from "@/features/organizations/repository";
import type {
  Organization,
  OrganizationMembership,
} from "@/features/organizations/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const ACTIVE_ORGANIZATION_COOKIE = "sightline-organization";

export type RequestPrincipal = Readonly<{
  id: string;
  email: string;
  emailVerified: boolean;
}>;

const readVerifiedUser = cache(async (): Promise<User | null> => {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) return null;
  return user;
});

export const getCurrentUser = cache(
  async (): Promise<RequestPrincipal | null> => {
    const user = await readVerifiedUser();
    if (!user?.email) return null;

    return {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.email_confirmed_at),
    };
  },
);

export const getCurrentSessionExpiresAt = cache(
  async (): Promise<number | null> => {
    const client = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) return null;

    const { data, error } = await client.auth.getClaims();
    if (error || !data || data.claims.sub !== user.id) return null;

    return typeof data.claims.exp === "number" ? data.claims.exp : null;
  },
);

export async function requireAuthenticatedUser(
  redirectTo = "/login",
): Promise<RequestPrincipal> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  if (!user.emailVerified) redirect("/verify-email");
  return user;
}

export async function setActiveOrganizationCookie(
  organizationId: string,
): Promise<void> {
  (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.SIGHTLINE_E2E !== "true",
  });
}

export const getCurrentMemberships = cache(
  async (): Promise<OrganizationMembership[]> => {
    const principal = await getCurrentUser();
    if (!principal) return [];
    return new OrganizationRepository(
      createAdminSupabaseClient(),
    ).listMemberships(principal.id);
  },
);

export const getCurrentMembership = cache(
  async (): Promise<OrganizationMembership | null> => {
    const memberships = await getCurrentMemberships();
    return memberships[0] ?? null;
  },
);

export const getCurrentOrganization = cache(
  async (): Promise<Organization | null> =>
    (await getCurrentMembership())?.organization ?? null,
);

export async function requireCurrentMembership(): Promise<OrganizationMembership> {
  await requireAuthenticatedUser();
  const membership = await getCurrentMembership();
  if (!membership) redirect("/organizations/new");
  void touchMembershipActivity(membership.id, membership.organizationId);
  return membership;
}

async function touchMembershipActivity(
  membershipId: string,
  organizationId: string,
): Promise<void> {
  const client = createAdminSupabaseClient();
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  await client
    .from("organization_memberships")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("organization_id", organizationId)
    .or(`last_active_at.is.null,last_active_at.lt.${cutoff}`);
}

export async function requireCurrentOrganization(): Promise<Organization> {
  return (await requireCurrentMembership()).organization;
}
