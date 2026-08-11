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
