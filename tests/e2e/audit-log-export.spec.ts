import { expect, test } from "@playwright/test";

test("exports the filtered organization audit log as CSV", async ({ page }) => {
  await page.goto("/settings/audit-log?outcome=success");
  const main = page.locator("#main-content");
  await expect(main.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(main.getByText(/coming later/i)).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await main.getByRole("link", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^sightline-audit-log-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();
  expect(csv).toContain('"occurred_at"');
  expect(csv).toContain('"correlation_id"');
  expect(csv).not.toContain(',"denied",');
});

test("does not expose audit exports to contributors", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill("alex-rivera@sightline.local");
  await page.getByLabel("Password").fill("Sightline-E2E-2026!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  const response = await page.request.get("/api/audit-log/export");
  expect(response.status()).toBe(404);
  expect(response.headers()["content-disposition"]).toBeUndefined();
  await context.close();
});
