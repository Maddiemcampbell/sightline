import { expect, test } from "@playwright/test";

test("loads the application shell and morning brief", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Know what is most likely to cost you money this week.",
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "View the brief" }).click();
  await expect(page).toHaveURL(/\/brief$/);
  await expect(
    page.getByRole("heading", { name: "Morning brief" }),
  ).toBeVisible();
});

test("exposes a healthy service endpoint", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    service: "sightline",
    status: "ok",
  });
});
