import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

test("authorized operator creates, updates, and audits a feature flag", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const key = `e2e-flag-${Date.now()}`;
  await page.goto("/internal/admin/settings");
  await expect(
    page.getByRole("heading", { name: "Feature flags" }),
  ).toBeVisible({
    timeout: 15_000,
  });
  const create = page.getByRole("form", { name: "Create flag" });
  await create.getByLabel("Stable key").fill(key);
  await create.getByLabel("Name").fill("E2E release flag");
  await create.getByLabel("Description").fill("Controlled E2E rollout.");
  await create.getByLabel("Environments").fill("production");
  await create.getByLabel("Rollout percentage").fill("25");
  await create
    .getByRole("button", { name: "Create flag" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => flagExists(key), { timeout: 30_000 }).toBe(true);
  const managementPage = await page.context().newPage();
  await managementPage.goto("/internal/admin/settings");

  const existing = managementPage
    .getByRole("region", { name: "Existing flags" })
    .locator("form")
    .filter({ has: managementPage.locator(`input[value="${key}"]`) });
  await expect(existing).toBeVisible({ timeout: 15_000 });
  await existing.getByLabel("Enabled").check();
  await existing
    .getByRole("button", { name: "Save flag" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => flagEnabled(key), { timeout: 30_000 }).toBe(true);
  const verificationPage = await page.context().newPage();
  await verificationPage.goto("/internal/admin/settings");
  const savedFlag = verificationPage
    .getByRole("region", { name: "Existing flags" })
    .locator("form")
    .filter({ has: verificationPage.locator(`input[value="${key}"]`) });
  await expect(savedFlag.getByLabel("Enabled")).toBeChecked({
    timeout: 15_000,
  });

  await expect
    .poll(() =>
      auditCount([
        "platform.feature_flag.created",
        "platform.feature_flag.updated",
      ]),
    )
    .toBeGreaterThanOrEqual(2);
});

test("operator records and inspects a release with linked flags", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const identifier = `e2e-release-${Date.now()}`;
  await page.goto("/internal/admin/releases");
  await expect(page.getByRole("heading", { name: "Releases" })).toBeVisible({
    timeout: 15_000,
  });
  const form = page.getByRole("form", { name: "Record release" });
  await form.getByLabel("Release identifier").fill(identifier);
  await form.getByLabel("Application version").fill("0.1.0-e2e");
  await form.getByLabel("Status").selectOption("failed");
  await form.getByLabel("Release notes").fill("Health verification failed.");
  await form
    .getByRole("button", { name: "Record release" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect
    .poll(() => releaseExists(identifier), { timeout: 30_000 })
    .toBe(true);
  const releaseId = await findReleaseId(identifier);
  if (!releaseId) throw new Error("Persisted release could not be loaded.");
  const detailPage = await page.context().newPage();
  await detailPage.goto(`/internal/admin/releases/${releaseId}`);
  await expect(detailPage).toHaveURL(
    /\/internal\/admin\/releases\/[0-9a-f-]+$/,
  );
  await expect(
    detailPage.getByText("Health verification failed."),
  ).toBeVisible();
  await expect
    .poll(() => auditCount(["platform.release.created"]))
    .toBeGreaterThanOrEqual(1);
});

test("operator marks a failed release as rolled back", async ({ page }) => {
  test.setTimeout(120_000);
  const identifier = `e2e-rollback-${Date.now()}`;
  const releaseId = await createReleaseFixture(identifier);
  await page.goto(`/internal/admin/releases/${releaseId}`);
  await expect(page.getByText("Fixture release failed.")).toBeVisible({
    timeout: 15_000,
  });
  const releaseForm = page
    .getByRole("button", { name: "Save release metadata" })
    .locator("xpath=ancestor::form");
  await expect(releaseForm.locator('select[name="status"]')).toHaveValue(
    "failed",
  );
  await releaseForm.evaluate((form: HTMLFormElement) => {
    const status = form.elements.namedItem("status");
    const rollbackStatus = form.elements.namedItem("rollbackStatus");
    if (
      !(status instanceof HTMLSelectElement) ||
      !(rollbackStatus instanceof HTMLSelectElement)
    )
      throw new Error("Release status controls are unavailable.");
    status.value = "rolled_back";
    rollbackStatus.value = "rolled_back";
    status.dispatchEvent(new Event("change", { bubbles: true }));
    rollbackStatus.dispatchEvent(new Event("change", { bubbles: true }));
    form.requestSubmit();
  });
  await expect
    .poll(() => releaseHasStatus(identifier, "rolled_back"), {
      timeout: 30_000,
    })
    .toBe(true);
  await expect
    .poll(() => auditCount(["platform.release.rolled_back"]))
    .toBeGreaterThanOrEqual(1);
});

for (const viewport of [
  { name: "tablet", width: 820, height: 1_000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`new internal interfaces remain usable without overflow on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    for (const path of [
      "/internal/admin/settings",
      "/internal/admin/releases",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      const menuButton = page.getByRole("button", {
        name: "Menu",
        exact: true,
      });
      await menuButton.click();
      const navigationDialog = page.getByRole("dialog", {
        name: "Platform administration",
      });
      await expect(navigationDialog).toBeVisible();
      await expect(
        navigationDialog.locator('[aria-current="page"]'),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(navigationDialog).toBeHidden();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow).toBe(false);
    }
  });
}

async function auditCount(actions: string[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });
  const { count, error } = await client
    .from("platform_audit_logs")
    .select("id", { count: "exact", head: true })
    .in("action", actions);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function releaseExists(identifier: string) {
  return Boolean(await findReleaseId(identifier));
}

async function findReleaseId(identifier: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });
  const { data, error } = await client
    .from("releases")
    .select("id")
    .eq("release_identifier", identifier)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function flagExists(key: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return false;
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { count, error } = await client
    .from("feature_flags")
    .select("id", { count: "exact", head: true })
    .eq("flag_key", key);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function flagEnabled(key: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return false;
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await client
    .from("feature_flags")
    .select("enabled")
    .eq("flag_key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.enabled ?? false;
}

async function releaseHasStatus(identifier: string, status: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });
  const { data, error } = await client
    .from("releases")
    .select("status")
    .eq("release_identifier", identifier)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.status === status;
}

async function createReleaseFixture(identifier: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase E2E environment is not configured.");
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });
  const { data: operator, error: operatorError } = await client
    .from("platform_operators")
    .select("id")
    .eq("email", "e2e-platform-operator@sightline.local")
    .single();
  if (operatorError) throw new Error(operatorError.message);
  const { data, error } = await client
    .from("releases")
    .insert({
      release_identifier: identifier,
      application_version: "0.1.0-e2e",
      environment: "production",
      status: "failed",
      release_notes: "Fixture release failed.",
      created_by_operator_id: operator.id,
      updated_by_operator_id: operator.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
