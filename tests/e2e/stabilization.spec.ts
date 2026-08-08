import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used by bug report tests.");
  }
}

test("preserves project values and focuses the first invalid field", async ({
  page,
}) => {
  await page.goto("/projects/new");

  await page.getByLabel("Project name").fill("Medical Office Renovation");
  await page.getByLabel("Street address").fill("100 Main Street");
  await page.getByLabel("City").fill("Oakland");
  await page.getByLabel("State").fill("C");
  await page.getByLabel("Postal code").fill("94607");
  await page.getByRole("button", { name: "Create first project" }).click();

  await expect(page.getByLabel("Project name")).toHaveValue(
    "Medical Office Renovation",
  );
  await expect(page.getByLabel("Street address")).toHaveValue(
    "100 Main Street",
  );
  await expect(page.getByLabel("City")).toHaveValue("Oakland");
  await expect(page.getByLabel("Postal code")).toHaveValue("94607");
  await expect(page.getByLabel("Project number")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText("Enter a project number.")).toBeVisible();
  await expect(page.getByLabel("State")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText("Use a two-letter state code.")).toBeVisible();
  await expect(page.getByLabel("Project number")).toBeFocused();
});

test("creates a project with required fields only", async ({ page }) => {
  await page.goto("/projects/new");

  const projectName = `Required Fields Project ${Date.now()}`;
  await page.getByLabel("Project name").fill(projectName);
  await page.getByLabel("Project number").fill(`REQ-${Date.now()}`);
  await page.getByRole("button", { name: "Create first project" }).click();

  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\?welcome=project$/);
  await expect(
    page.getByRole("heading", { name: projectName, exact: true }),
  ).toBeVisible();
});

test("coordinates header dropdowns and closes them from outside", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Help and support" }).click();
  await expect(
    page.getByRole("menu", { name: "Help and support" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(
    page.getByRole("menu", { name: "Help and support" }),
  ).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Notifications" }),
  ).toBeVisible();

  await page.locator("#main-content").click({ position: { x: 10, y: 10 } });
  await expect(
    page.getByRole("heading", { name: "Notifications" }),
  ).toBeHidden();
});

test("preserves a customer bug report while showing inline validation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help and support" }).click();
  await page.getByRole("menuitem", { name: /Report a problem/ }).click();
  const dialog = page.getByRole("dialog", { name: "Report a problem" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title").fill("Daily brief does not refresh");
  await dialog.getByLabel("What happened?").fill("short");
  await dialog.getByLabel("Steps to reproduce").fill("Open the daily brief.");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(
    dialog.getByText("Describe what happened in at least 10 characters."),
  ).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText(
    "Check the highlighted fields and try again.",
  );
  await expect(dialog.getByLabel("Title")).toHaveValue(
    "Daily brief does not refresh",
  );
  await expect(dialog.getByLabel("Steps to reproduce")).toHaveValue(
    "Open the daily brief.",
  );
  await expect(dialog.getByLabel("What happened?")).toBeFocused();
});

test("shows a clear confirmation after a bug report is accepted", async ({
  page,
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: UnusedWebSocketTransport as never },
  });
  const title = `Evidence panel is not loading ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("button", { name: "Help and support" }).click();
  await page.getByRole("menuitem", { name: /Report a problem/ }).click();
  const dialog = page.getByRole("dialog", { name: "Report a problem" });
  await dialog.getByLabel("Title").fill(title);
  await dialog
    .getByLabel("What happened?")
    .fill("The evidence panel remained empty after opening the selected risk.");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByRole("status")).toHaveText(
    "Thanks — your report was sent to the Sightline team.",
  );
  await expect
    .poll(async () => {
      const { data, error } = await admin
        .from("bug_reports")
        .select("description,status")
        .eq("title", title)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    })
    .toEqual({
      description:
        "The evidence panel remained empty after opening the selected risk.",
      status: "new",
    });
});

test("closes search only from its X button or backdrop", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Search Sightline" }).click();
  const dialog = page.getByRole("dialog", { name: "Search Sightline" });
  const searchInput = page.getByPlaceholder(
    "Search projects, risks, actions, documents, or people…",
  );
  await expect(dialog).toBeVisible();
  await expect(searchInput).toBeFocused();
  expect(
    await searchInput.evaluate((input) => getComputedStyle(input).outlineStyle),
  ).toBe("none");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Close search" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Search Sightline" }).click();
  await expect(dialog).toBeVisible();
  await page
    .locator('[role="presentation"]')
    .filter({ has: dialog })
    .click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeHidden();
});
