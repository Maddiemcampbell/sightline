import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { expect, test as setup } from "@playwright/test";

import { ensureE2eAuthUser } from "./support/auth-users";

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
    setup.setTimeout(90_000);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("Supabase E2E environment is not configured.");
    }
    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: UnusedWebSocketTransport as never },
    });
    const resolvedOwnerAuthUserId = await ensureE2eAuthUser({
      admin,
      id: authUserId,
      email,
      password,
    });
    const { error: userError } = await admin
      .from("users")
      .update({ auth_user_id: resolvedOwnerAuthUserId, email })
      .eq("organization_id", organizationId)
      .eq("id", applicationUserId);
    if (userError) throw new Error(userError.message);
    const { error: membershipError } = await admin
      .from("organization_memberships")
      .upsert(
        {
          organization_id: organizationId,
          auth_user_id: resolvedOwnerAuthUserId,
          application_user_id: applicationUserId,
          role: "owner",
        },
        { onConflict: "organization_id,application_user_id" },
      );
    if (membershipError) throw new Error(membershipError.message);
    const resolvedAlexAuthUserId = await ensureE2eAuthUser({
      admin,
      id: alexAuthUserId,
      email: "alex-rivera@sightline.local",
      password,
    });
    const { error: alexUserError } = await admin
      .from("users")
      .update({
        auth_user_id: resolvedAlexAuthUserId,
        email: "alex-rivera@sightline.local",
      })
      .eq("organization_id", organizationId)
      .eq("id", alexApplicationUserId);
    if (alexUserError) throw new Error(alexUserError.message);
    const { data: alexMembership, error: alexMembershipError } = await admin
      .from("organization_memberships")
      .upsert(
        {
          organization_id: organizationId,
          auth_user_id: resolvedAlexAuthUserId,
          application_user_id: alexApplicationUserId,
          role: "contributor",
        },
        { onConflict: "organization_id,application_user_id" },
      )
      .select("id")
      .single();
    if (alexMembershipError) throw new Error(alexMembershipError.message);
    const { data: projects, error: projectsError } = await admin
      .from("projects")
      .select("id")
      .eq("organization_id", organizationId);
    if (projectsError) throw new Error(projectsError.message);
    const { error: projectMembershipError } = await admin
      .from("project_memberships")
      .upsert(
        (projects ?? []).map((project) => ({
          organization_id: organizationId,
          project_id: project.id,
          organization_membership_id: alexMembership.id,
          role: "contributor",
        })),
        { onConflict: "project_id,organization_membership_id" },
      );
    if (projectMembershipError) throw new Error(projectMembershipError.message);

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
