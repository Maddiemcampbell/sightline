import { createClient } from "@supabase/supabase-js";

type AdminClient = ReturnType<typeof createClient>;

const AUTH_READY_TIMEOUT_MS = 45_000;
const MAX_RETRY_DELAY_MS = 5_000;

export async function ensureE2eAuthUser({
  admin,
  auth,
  id,
  email,
  password,
}: {
  admin: AdminClient;
  auth: AdminClient;
  id: string;
  email: string;
  password: string;
}) {
  let lastError = "Supabase Auth did not return a user.";
  const deadline = Date.now() + AUTH_READY_TIMEOUT_MS;
  let retryDelay = 250;

  while (true) {
    // Creating first avoids the local listUsers endpoint, which can be
    // unavailable immediately after a database reset.
    const created = await admin.auth.admin.createUser({
      id,
      email,
      password,
      email_confirm: true,
    });
    if (!created.error && created.data.user) {
      const loginError = await waitForPasswordLogin(auth, email, password);
      if (!loginError) return created.data.user.id;
      lastError = authError("Created Auth user cannot sign in", loginError);
      const updated = await admin.auth.admin.updateUserById(
        created.data.user.id,
        { password, email_confirm: true },
      );
      if (updated.error) {
        lastError = authError("Unable to reset Auth password", updated.error);
      } else {
        const resetLoginError = await waitForPasswordLogin(
          auth,
          email,
          password,
        );
        if (!resetLoginError) return created.data.user.id;
        lastError = authError(
          "Reset Auth password cannot sign in",
          resetLoginError,
        );
      }
    }

    const existing = await admin.auth.admin.getUserById(id);
    if (existing.data.user) {
      const updated = await admin.auth.admin.updateUserById(id, {
        email,
        password,
        email_confirm: true,
      });
      if (!updated.error) {
        const loginError = await waitForPasswordLogin(auth, email, password);
        if (!loginError) return id;
        lastError = authError("Updated Auth user cannot sign in", loginError);
      } else {
        lastError = authError("Unable to update Auth user", updated.error);
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(retryDelay, remaining)),
      );
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
      continue;
    }

    const listed = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1_000,
    });
    const duplicate = (listed.data?.users ?? []).find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (duplicate) {
      const updated = await admin.auth.admin.updateUserById(duplicate.id, {
        email,
        password,
        email_confirm: true,
      });
      if (!updated.error) {
        const loginError = await waitForPasswordLogin(auth, email, password);
        if (!loginError) return duplicate.id;
        lastError = authError(
          "Updated matching Auth user cannot sign in",
          loginError,
        );
      } else {
        lastError = authError(
          "Unable to update matching Auth user",
          updated.error,
        );
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(retryDelay, remaining)),
      );
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
      continue;
    }

    lastError = [
      authError("Unable to create Auth user", created.error),
      authError("Unable to read Auth user", existing.error),
      authError("Unable to list Auth users", listed.error),
    ].join("; ");

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryDelay, remaining)),
    );
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
  }

  throw new Error(lastError);
}

async function waitForPasswordLogin(
  auth: AdminClient,
  email: string,
  password: string,
) {
  let lastError = null;
  for (const delay of [0, 250, 500, 1_000, 2_000]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const { error } = await auth.auth.signInWithPassword({ email, password });
    if (!error) {
      await auth.auth.signOut();
      return null;
    }
    lastError = error;
  }
  return lastError;
}

function authError(
  prefix: string,
  error: {
    message?: string | undefined;
    name?: string | undefined;
    code?: string | undefined;
    status?: number | undefined;
  } | null,
) {
  if (!error) return `${prefix}: unknown error`;
  const detail =
    (error.message && error.message !== "{}" ? error.message : null) ||
    error.code ||
    error.name ||
    "Auth service unavailable";
  return `${prefix}: ${detail}${error.status ? ` (${error.status})` : ""}`;
}
