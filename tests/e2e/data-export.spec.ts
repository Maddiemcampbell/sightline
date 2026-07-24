import { test, expect } from "@playwright/test";

test("shows asynchronous organization data export controls and history", async ({ page }) => {
  await page.goto("/settings/data-export");
  await expect(
    page.getByRole("heading", { name: "Export organization data" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /^CSV/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^JSON/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^ZIP package/ })).toBeChecked();
  await page.getByRole("button", { name: "Request export" }).click();
  await expect(page.getByRole("status")).toContainText("notify you when it is ready");
  await expect(page.getByRole("cell", { name: "ZIP" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Queued" })).toBeVisible();
});
