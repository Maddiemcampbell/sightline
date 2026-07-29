import { expect, test } from "@playwright/test";

test("dashboard modules share the selected accessible project scope", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, Matt." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Portfolio overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Top risk drivers" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Portfolio risk heatmap" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Sightline AI assistant" }),
  ).toBeVisible();

  const filter = page.getByRole("button", { name: /All accessible projects/ });
  await filter.click();
  await page
    .getByRole("option", { name: "Cedar Grove Medical Pavilion" })
    .click();
  await expect(
    page.getByText("Scope: Cedar Grove Medical Pavilion"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Cedar Grove Medical Pavilion",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", {
        name: /Cedar Grove Medical Pavilion, .*active risk/,
      })
      .first(),
  ).toHaveAttribute("href", /project=20000000-0000-4000-8000-000000000001/);
});

for (const viewport of [
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`dashboard remains usable without page overflow on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Good morning, Matt." }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Quick Ask Sightline" }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
}
