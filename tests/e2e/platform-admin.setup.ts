import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { expect, test as setup } from "@playwright/test";

const authState = "test-results/e2e-platform-auth.json";
const email = "e2e-platform-operator@sightline.local";
const password = "Sightline-Platform-E2E-2026!";
const permissions = [
  "platform.dashboard.read",
  "platform.organizations.read",
  "platform.users.read",
  "platform.audit.read",
  "platform.jobs.read",
  "platform.ai.read",
  "platform.health.read",
] as const;

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used by the platform E2E setup.");
  }
}

setup(
  "creates and authenticates a separated platform operator",
  async ({ page }) => {
    setup.setTimeout(90_000);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey)
      throw new Error("Supabase E2E environment is not configured.");
    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: UnusedWebSocketTransport as never },
    });
    const authUserId = await ensureAuthUser(admin);
    const { data: operator, error: operatorError } = await admin
      .from("platform_operators")
      .upsert(
        {
          auth_user_id: authUserId,
          email,
          display_name: "E2E Platform Operator",
          status: "active",
        },
        { onConflict: "auth_user_id" },
      )
      .select("id")
      .single();
    if (operatorError) throw new Error(operatorError.message);
    const { error: grantsError } = await admin
      .from("platform_operator_permissions")
      .upsert(
        permissions.map((permission) => ({
          operator_id: operator.id,
          permission,
        })),
        { onConflict: "operator_id,permission" },
      );
    if (grantsError) throw new Error(grantsError.message);

    await page.goto("/login?next=%2Finternal%2Fadmin");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/internal/admin");
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    await mkdir(dirname(authState), { recursive: true });
    await page.context().storageState({ path: authState });
  },
);

async function ensureAuthUser(admin: ReturnType<typeof createClient>) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });
  if (listError) throw new Error(listError.message);
  const existing = listed.users.find(
    (candidate) => candidate.email?.toLowerCase() === email,
  );
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(error?.message ?? "Platform E2E user was not created.");
  return data.user.id;
}
