import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { expect, test as setup } from "@playwright/test";

const authState = "test-results/e2e-auth.json";
const authUserId = "12000000-0000-4000-8000-000000000001";
const organizationId = "10000000-0000-4000-8000-000000000001";
const applicationUserId = "11000000-0000-4000-8000-000000000001";
const alexAuthUserId = "12000000-0000-4000-8000-000000000002";
const alexApplicationUserId = "11000000-0000-4000-8000-000000000002";
const email = "e2e-owner@sightline.local";
const password = "Sightline-E2E-2026!";

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used by the E2E authentication setup.");
  }
}

setup(
  "creates and authenticates the verified organization owner",
  async ({ page }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("Supabase E2E environment is not configured.");
    }
    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: UnusedWebSocketTransport as never },
    });
    await ensureAuthUser(admin, authUserId, email);
    const { error: userError } = await admin
      .from("users")
      .update({ auth_user_id: authUserId, email })
      .eq("organization_id", organizationId)
      .eq("id", applicationUserId);
    if (userError) throw new Error(userError.message);
    const { error: membershipError } = await admin
      .from("organization_memberships")
      .insert({
        organization_id: organizationId,
        auth_user_id: authUserId,
        application_user_id: applicationUserId,
        role: "owner",
      });
    if (membershipError) throw new Error(membershipError.message);
    await ensureAuthUser(
      admin,
      alexAuthUserId,
      "alex-rivera@sightline.local",
    );
    const { error: alexUserError } = await admin
      .from("users")
      .update({
        auth_user_id: alexAuthUserId,
        email: "alex-rivera@sightline.local",
      })
      .eq("organization_id", organizationId)
      .eq("id", alexApplicationUserId);
    if (alexUserError) throw new Error(alexUserError.message);
    const { error: alexMembershipError } = await admin
      .from("organization_memberships")
      .insert({
        organization_id: organizationId,
        auth_user_id: alexAuthUserId,
        application_user_id: alexApplicationUserId,
        role: "contributor",
      });
    if (alexMembershipError) throw new Error(alexMembershipError.message);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByRole("heading", { name: "Good morning, Matt." }),
    ).toBeVisible();
    await mkdir(dirname(authState), { recursive: true });
    await page.context().storageState({ path: authState });
  },
);

async function ensureAuthUser(
  admin: ReturnType<typeof createClient>,
  id: string,
  userEmail: string,
) {
  await expect
    .poll(
      async () => {
        const created = await admin.auth.admin.createUser({
          id,
          email: userEmail,
          password,
          email_confirm: true,
        });
        if (!created.error) return true;
        const existing = await admin.auth.admin.getUserById(id);
        return existing.data.user?.email === userEmail;
      },
      { timeout: 20_000, intervals: [250, 500, 1_000] },
    )
    .toBe(true);
}
