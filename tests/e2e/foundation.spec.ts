import { expect, test } from "@playwright/test";

test("loads the application shell and morning brief", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Good morning, Matt.",
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open Daily Brief" }).click();
  await expect(page).toHaveURL(/\/brief$/);
  await expect(
    page.getByRole("heading", { name: "Good morning, Matt." }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByText("Total profit at risk")).toBeVisible();
});

test("requires a reason before dismissing a brief risk", async ({ page }) => {
  await page.goto("/brief");
  const firstRisk = page.getByRole("article").first();
  await firstRisk.getByRole("button", { name: "Dismiss" }).click();
  await firstRisk.getByRole("button", { name: "Confirm dismissal" }).click();
  await expect(firstRisk.getByRole("alert")).toContainText(
    "at least 10 characters",
  );
});

test("acknowledges a risk and persists after reload", async ({ page }) => {
  await page.goto("/brief");
  const firstRisk = page.getByRole("article").first();
  const acknowledge = firstRisk.getByRole("button", {
    name: "Acknowledge",
    exact: true,
  });
  if (await acknowledge.isVisible()) await acknowledge.click();
  await expect(firstRisk.getByRole("status")).toHaveText("Acknowledged");
  await page.reload();
  await expect(
    page.getByRole("article").first().getByRole("status"),
  ).toHaveText("Acknowledged");
});

test("exposes a healthy service endpoint", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    service: "sightline",
    status: "ok",
  });
});

test("filters projects with shareable URL parameters", async ({ page }) => {
  await page.goto("/projects");
  await page.getByLabel("Search projects").fill("Medical");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page).toHaveURL(/projects\?q=Medical/);
  await expect(page.getByRole("heading", { name: /Medical/ })).toBeVisible();
});

test("opens a risk detail with evidence and actions", async ({ page }) => {
  await page.goto("/risks");
  await page.getByRole("link", { name: "View risk" }).first().click();

  await expect(page).toHaveURL(/\/risks\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Evidence" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recommended actions" }),
  ).toBeVisible();
});
