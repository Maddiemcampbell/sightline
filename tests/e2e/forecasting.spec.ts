import { expect, test } from "@playwright/test";

test("reviews the deterministic forecast and explores a scenario", async ({
  page,
}) => {
  await page.goto("/forecasts");
  await expect(
    page.getByRole("heading", { name: "Forecasting" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Project outlook" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "30 / 60 / 90-day cash outlook" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Can this forecast be trusted?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /projects? need review/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Prepare meeting" }),
  ).toBeVisible();

  const scenario = page.getByRole("region", { name: "What changes if…" });
  await scenario.getByLabel("Assumption").selectOption("completion_delay");
  await expect(
    scenario.getByRole("heading", {
      name: "Completion moves four weeks later",
    }),
  ).toBeVisible();
  await expect(
    scenario.getByText(/does not infer financial delay costs/i),
  ).toBeVisible();
  await expect(scenario.getByText("Official forecast unchanged")).toBeVisible();
});

test("forecasting remains readable without horizontal page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/forecasts");
  await expect(
    page.getByRole("heading", { name: "Forecasting" }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("explains forecast readiness and links data gaps to corrective work", async ({
  page,
}) => {
  await page.goto("/forecasts");
  await page.getByRole("link", { name: "Open data-readiness center" }).click();
  await expect(page).toHaveURL("/forecasts/readiness");
  await expect(
    page.getByRole("heading", { name: "Data-readiness center" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Improve forecast accuracy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Integration readiness" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Readiness by project" }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar").first()).toBeVisible();
  const summary = page.getByRole("region", { name: "Readiness summary" });
  await expect(
    summary.getByText("Authoritative values", { exact: true }),
  ).toBeVisible();
  await expect(
    summary.getByText("Estimated values", { exact: true }),
  ).toBeVisible();
});

test("data readiness remains readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/forecasts/readiness");
  await expect(
    page.getByRole("heading", { name: "Data-readiness center" }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});
