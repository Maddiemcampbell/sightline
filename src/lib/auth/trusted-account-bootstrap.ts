import "server-only";

import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function bootstrapAndSignInTrustedAccount(input: {
  email: string;
  password: string;
  fullName: string;
  accountSource: "customer_owner_activation" | "organization_invitation";
}) {
  const admin = createAdminSupabaseClient();
  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      account_source: input.accountSource,
    },
  });
  if (
    created.error &&
    !/already|registered|exists/i.test(created.error.message)
  )
    throw new Error("The invited account could not be prepared.");

  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error || data.user.email?.toLowerCase() !== input.email.toLowerCase())
    throw new Error(
      created.error
        ? "An account already exists for this email. Enter its current password or log in normally."
        : "The invited account could not be authenticated.",
    );
  return {
    id: data.user.id,
    email: input.email.toLowerCase(),
    emailVerified: true,
  };
}
