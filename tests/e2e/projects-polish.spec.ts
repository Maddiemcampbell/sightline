import { expect, test } from "@playwright/test";

test("presents the accessible project comparison table on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects");
  const main = page.locator("#main-content");

  await expect(
    main.getByRole("heading", { level: 1, name: "Projects" }),
  ).toBeVisible();
  await expect(main.getByRole("table")).toBeVisible();
  await expect(
    main.getByRole("columnheader", { name: "Forecast margin" }),
  ).toBeVisible();
  await expect(
    main.locator('img[src*="project-fallback-architecture-v2"]'),
  ).not.toHaveCount(0);
});

for (const viewport of [
  { name: "tablet", width: 1024, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`uses project cards without page overflow on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/projects");
    const main = page.locator("#main-content");

    await expect(main.getByRole("table")).toBeHidden();
    await expect(main.getByRole("heading", { name: /Medical/ })).toBeVisible();
    await expect(main.getByLabel("Project filters")).toBeVisible();
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasPageOverflow).toBe(false);
  });
}
