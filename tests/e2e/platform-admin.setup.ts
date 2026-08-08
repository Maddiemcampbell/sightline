import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { expect, test as setup } from "@playwright/test";

import { ensureE2eAuthUser } from "./support/auth-users";
import { loginWithAuthReadiness } from "./support/login";

const authState = "test-results/e2e-platform-auth.json";
const authUserId = "12000000-0000-4000-8000-000000000003";
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
  "platform.support.read",
  "platform.support.write",
  "platform.flags.manage",
  "platform.releases.read",
  "platform.admin.manage",
  "platform.provisioning.manage",
] as const;

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used by the platform E2E setup.");
  }
}

setup(
  "creates and authenticates a separated platform operator",
  async ({ page }) => {
    setup.setTimeout(120_000);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !serviceRoleKey || !publishableKey)
      throw new Error("Supabase E2E environment is not configured.");
    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: UnusedWebSocketTransport as never },
    });
    const auth = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: UnusedWebSocketTransport as never },
    });
    const resolvedAuthUserId = await ensureE2eAuthUser({
      admin,
      auth,
      id: authUserId,
      email,
      password,
    });
    const { data: operator, error: operatorError } = await admin
      .from("platform_operators")
      .upsert(
        {
          auth_user_id: resolvedAuthUserId,
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

    await loginWithAuthReadiness({
      page,
      email,
      password,
      destination: "/internal/admin",
    });
    await expect(page).toHaveURL("/internal/admin");
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    await mkdir(dirname(authState), { recursive: true });
    await page.context().storageState({ path: authState });
  },
);
