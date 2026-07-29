import { createClient } from "@supabase/supabase-js";

type AdminClient = ReturnType<typeof createClient>;

export async function ensureE2eAuthUser({
  admin,
  id,
  email,
  password,
}: {
  admin: AdminClient;
  id: string;
  email: string;
  password: string;
}) {
  let lastError = "Supabase Auth did not return a user.";
  const retryDelays = [0, 250, 500, 1_000, 2_000, 4_000] as const;

  for (const delay of retryDelays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

    // Creating first avoids the local listUsers endpoint, which can be
    // unavailable immediately after a database reset.
    const created = await admin.auth.admin.createUser({
      id,
      email,
      password,
      email_confirm: true,
    });
    if (!created.error && created.data.user) return created.data.user.id;

    const existing = await admin.auth.admin.getUserById(id);
    if (existing.data.user) {
      const updated = await admin.auth.admin.updateUserById(id, {
        email,
        password,
        email_confirm: true,
      });
      if (!updated.error) return id;
      lastError = authError("Unable to update Auth user", updated.error);
      continue;
    }

    lastError = [
      authError("Unable to create Auth user", created.error),
      authError("Unable to read Auth user", existing.error),
    ].join("; ");
  }

  throw new Error(lastError);
}

function authError(
  prefix: string,
  error: {
    message?: string;
    name?: string;
    code?: string;
    status?: number;
  } | null,
) {
  if (!error) return `${prefix}: unknown error`;
  const detail =
    error.message || error.code || error.name || "Auth service unavailable";
  return `${prefix}: ${detail}${error.status ? ` (${error.status})` : ""}`;
}
