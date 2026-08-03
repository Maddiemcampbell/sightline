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

  await expect(page).toHaveURL("/", { timeout: 15_000 });
  await expect(
    page
      .locator("#main-content")
      .getByRole("heading", { name: "Good morning, Alex." }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("region", { name: "Portfolio Watch" }),
  ).toBeVisible();
  await expect(page.getByText("Restricted for your role")).toHaveCount(0);
  await expect(page.getByText("Budget variance")).toHaveCount(0);
  await expect(page.getByText("Forecasted margin")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Portfolio Watch" }).getByText(/\$/),
  ).toHaveCount(0);

  await page.goto("/projects?sort=exposure");
  await expect(page.getByText("Represented exposure")).toHaveCount(0);
  await expect(page.getByText("Average forecast margin")).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Budget" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("columnheader", { name: "Forecast margin" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Highest exposure" }),
  ).toHaveCount(0);

  const projectHref = await page
    .getByRole("link", { name: "View project" })
    .first()
    .getAttribute("href");
  expect(projectHref).toBeTruthy();
  await page.goto(projectHref!);
  await expect(page.getByText("Contract value")).toHaveCount(0);
  await expect(page.getByText("Projected margin")).toHaveCount(0);
  await expect(page.getByText("Profit at risk")).toHaveCount(0);
  await expect(page.getByText("Exposure restricted")).toHaveCount(0);

  await page.goto("/reports");
  await expect(page.getByText("Financial Performance")).toHaveCount(0);
  await expect(page.getByText(/Restricted for your role/i)).toHaveCount(0);

  await context.close();
});
