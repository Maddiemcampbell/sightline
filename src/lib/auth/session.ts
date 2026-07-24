import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export const getCurrentSession = cache(
  async (): Promise<Session | null> => {
    const user = await readVerifiedUser();
    if (!user) return null;

    const client = await createServerSupabaseClient();
    const {
      data: { session },
    } = await client.auth.getSession();

    return session?.user.id === user.id ? session : null;
  },
);

export async function requireAuthenticatedUser(
  redirectTo = "/login",
): Promise<RequestPrincipal> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function getCurrentOrganization(): Promise<null> {
  // Organization membership and selection intentionally arrive in V3.1 PR 2.
  return null;
}
