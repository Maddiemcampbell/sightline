import { expect, test } from "@playwright/test";

test("preserves a protected onboarding destination through login and signup", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto("/projects/new");
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects%2Fnew$/);
  await expect(
    page.getByRole("link", { name: "Create an account" }),
  ).toHaveAttribute("href", "/signup?next=%2Fprojects%2Fnew");
  await context.close();
});

test("shows the server-authorized first project form to an organization owner", async ({
  page,
}) => {
  await page.goto("/projects/new?welcome=organization");
  await expect(
    page.getByRole("heading", { name: "Add your first project" }),
  ).toBeVisible();
  await expect(page.getByText("Organization created").first()).toBeVisible();
  await expect(page.getByLabel("Project name")).toBeVisible();
  await expect(page.getByLabel("Project number")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create first project" }),
  ).toBeVisible();
});
