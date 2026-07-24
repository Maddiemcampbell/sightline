import { expect, test } from "@playwright/test";

test("contributor can open the homepage without financial exposure", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill("alex-rivera@sightline.local");
  await page.getByLabel("Password").fill("Sightline-E2E-2026!");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(
    page.getByRole("heading", { name: "Good morning, Alex." }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Portfolio Watch" }),
  ).toBeVisible();
  await expect(
    page.getByText("Restricted for your role").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Portfolio Watch" }).getByText(/\$/),
  ).toHaveCount(0);

  await context.close();
});
