import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";

const organizationId = "10000000-0000-4000-8000-000000000001";

test("shows asynchronous organization data export controls and history", async ({ page }) => {
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
