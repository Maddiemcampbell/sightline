import { expect, test } from "@playwright/test";

const projectId = "20000000-0000-4000-8000-000000000001";

test("presents the polished project overview without losing core workflows", async ({
  page,
}) => {
  await page.goto(`/projects/${projectId}`);
  const main = page.locator("#main-content");

  await expect(
    main.getByRole("heading", {
      level: 1,
      name: "Cedar Grove Medical Pavilion",
    }),
  ).toBeVisible();
  await expect(
    main.getByRole("navigation", { name: "Project sections" }),
  ).toBeVisible();
  await expect(main.getByText("Project health", { exact: true })).toBeVisible();
  await expect(main.getByText("Risk exposure", { exact: true })).toBeVisible();
  await expect(
    main.getByRole("complementary", { name: "Project AI advisor" }),
  ).toBeVisible();
  await expect(main.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(
    main.locator('img[src*="cedar-grove-medical-pavilion"]'),
  ).toHaveCount(1);
});

test("keeps the project overview usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/projects/${projectId}`);
  const main = page.locator("#main-content");

  await expect(
    main.getByRole("heading", {
      level: 1,
      name: "Cedar Grove Medical Pavilion",
    }),
  ).toBeVisible();
  await expect(main.getByLabel("Project sections")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
