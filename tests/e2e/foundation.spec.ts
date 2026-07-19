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
  const acknowledgedStatus = firstRisk.getByRole("status");
  await expect(acknowledgedStatus.or(acknowledge)).toBeVisible();
  if (await acknowledge.isVisible()) {
    await acknowledge.click();
  }
  await expect(acknowledgedStatus).toHaveText("Acknowledged");
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

test("shows the secure document upload workflow", async ({ page }) => {
  await page.goto("/documents");

  await expect(
    page.getByRole("heading", { name: "Upload source document" }),
  ).toBeVisible();
  await expect(page.getByLabel("File")).toHaveAttribute(
    "accept",
    ".pdf,.docx,.csv,.jpg,.jpeg,.png",
  );
  await expect(
    page.getByRole("heading", { name: "Document library" }),
  ).toBeVisible();
});

test("uploads, edits, and archives document metadata", async ({ page }) => {
  await page.goto("/documents");
  await page.getByLabel("File").setInputFiles({
    name: "weekly-log.pdf",
    mimeType: "text/plain",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await page.getByLabel("Display name").fill("Weekly field log");
  await page.getByLabel("Category").selectOption("daily_log");
  await page.getByRole("button", { name: "Upload document" }).click();

  await expect(page.getByText("Upload complete.")).toBeVisible();
  await page.getByRole("link", { name: "View document" }).click();
  await page.getByLabel("Display name").fill("Weekly field log — reviewed");
  await page.getByRole("button", { name: "Save metadata" }).click();
  await expect(page.getByText("Document metadata updated.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Weekly field log — reviewed" }),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive document" }).click();
  await expect(page.getByText("Document archived.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download file" })).toHaveCount(
    0,
  );
});
