import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";

const organizationId = "10000000-0000-4000-8000-000000000001";

test("shows asynchronous organization data export controls and history", async ({
  page,
}) => {
  const requestedAfter = new Date().toISOString();
  await page.goto("/settings/data-export");
  await expect(
    page.getByRole("heading", { name: "Export organization data" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /^CSV/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^JSON/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^ZIP package/ })).toBeChecked();
  await page.getByRole("button", { name: "Request export" }).click();
  await expect
    .poll(() => exportWasQueued(requestedAfter), { timeout: 30_000 })
    .toBe(true);

  const historyPage = await page.context().newPage();
  await historyPage.goto("/settings/data-export");
  await expect(historyPage.getByRole("cell", { name: "ZIP" })).toBeVisible();
  await expect(historyPage.getByRole("cell", { name: "Queued" })).toBeVisible();
});

test("configures recurring organization data exports", async ({ page }) => {
  await page.goto("/settings/data-export");
  const recurring = page
    .getByRole("heading", { name: "Recurring exports" })
    .locator("..");
  await recurring.getByLabel("Enable recurring exports").check();
  await recurring.getByLabel("Format").selectOption("csv");
  await recurring.getByLabel("Frequency").selectOption("weekly");
  await recurring.getByLabel("Weekly day").selectOption("1");
  await recurring.getByLabel("Local time").fill("06:30");
  await recurring
    .getByRole("button", { name: "Save recurring schedule" })
    .click();
  await expect(recurring.getByRole("status")).toHaveText(
    "Recurring export schedule saved.",
  );
  await expect.poll(() => recurringScheduleWasSaved()).toBe(true);
});

async function exportWasQueued(requestedAfter: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });
  const { count, error } = await client
    .from("organization_data_exports")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("export_format", "zip")
    .eq("status", "queued")
    .gte("requested_at", requestedAfter);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

async function recurringScheduleWasSaved() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client
    .from("organization_data_export_schedules")
    .select("enabled,export_format,cadence,weekday,local_time")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(
    data?.enabled &&
    data.export_format === "csv" &&
    data.cadence === "weekly" &&
    data.weekday === 1 &&
    data.local_time.startsWith("06:30"),
  );
}
