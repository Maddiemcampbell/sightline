import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

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

export const getCurrentSession = cache(async (): Promise<Session | null> => {
  const user = await readVerifiedUser();
  if (!user) return null;

  const client = await createServerSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  return session?.user.id === user.id ? session : null;
});

export async function requireAuthenticatedUser(
  redirectTo = "/login",
): Promise<RequestPrincipal> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  if (!user.emailVerified) redirect("/verify-email");
  return user;
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
    if (!memberships.length) return null;
    const preferredOrganizationId = (await cookies()).get(
      ACTIVE_ORGANIZATION_COOKIE,
    )?.value;
    return (
      memberships.find(
        (membership) => membership.organizationId === preferredOrganizationId,
      ) ?? memberships[0]!
    );
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
