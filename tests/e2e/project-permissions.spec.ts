import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const projectId = "20000000-0000-4000-8000-000000000001";
const organizationId = "10000000-0000-4000-8000-000000000001";

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used by project permission tests.");
  }
}

test("shows project members and opens the project access dialog", async ({
  page,
}) => {
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Manage access" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage access" }).click();
  await expect(
    page.getByRole("dialog", { name: "Project access" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Assign selected" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove selected" }),
  ).toBeVisible();
  await expect(page.getByLabel("Project invite email")).toBeVisible();
});

test("project visibility updates immediately after assignment", async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: UnusedWebSocketTransport as never },
  });
  const authUserId = "12000000-0000-4000-8000-000000000010";
  const applicationUserId = "11000000-0000-4000-8000-000000000010";
  const membershipId = "13000000-0000-4000-8000-000000000010";
  const email = "project-manager@sightline.local";
  const password = "Sightline-Project-2026!";
  const { error: authError } = await admin.auth.admin.createUser({
    id: authUserId,
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);
  const { error: userError } = await admin.from("users").insert({
    id: applicationUserId,
    organization_id: organizationId,
    auth_user_id: authUserId,
    email,
    full_name: "Project Manager",
    role: "project_manager",
  });
  if (userError) throw new Error(userError.message);
  const { error: membershipError } = await admin
    .from("organization_memberships")
    .insert({
      id: membershipId,
      organization_id: organizationId,
      auth_user_id: authUserId,
      application_user_id: applicationUserId,
      role: "manager",
    });
  if (membershipError) throw new Error(membershipError.message);

  const managerContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const managerPage = await managerContext.newPage();
  await managerPage.goto(
    `http://127.0.0.1:3100/login?next=/projects/${projectId}`,
  );
  await managerPage.getByLabel("Email").fill(email);
  await managerPage.getByLabel("Password").fill(password);
  await managerPage.getByRole("button", { name: "Log in" }).click();
  await expect(
    managerPage.getByRole("heading", { name: "This page could not be found." }),
  ).toBeVisible();

  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: "Manage access" }).click();
  await page.getByText("Project Manager", { exact: true }).click();
  await page.getByLabel("Project role").selectOption("manager");
  await page.getByRole("button", { name: "Assign selected" }).click();
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("project_memberships")
          .select("role")
          .eq("organization_id", organizationId)
          .eq("project_id", projectId)
          .eq("organization_membership_id", membershipId)
          .maybeSingle();
        return data?.role ?? null;
      },
      { timeout: 20_000 },
    )
    .toBe("manager");

  await managerPage.goto(`http://127.0.0.1:3100/projects/${projectId}`);
  await expect(
    managerPage.getByRole("heading", {
      name: "Cedar Grove Medical Pavilion",
    }),
  ).toBeVisible();
  await managerContext.close();
});
