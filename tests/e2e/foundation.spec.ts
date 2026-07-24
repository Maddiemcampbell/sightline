import { expect, test } from "@playwright/test";

test("loads the application shell and morning brief", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Good morning, Matt.",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Open Daily Brief" }),
  ).toHaveAttribute("href", "/brief");
  await page.goto("/brief");
  await expect(
    page.getByRole("heading", { name: "Good morning, Matt." }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByText("Total profit at risk")).toBeVisible();
});

test("filters the organization action register with shareable URL parameters", async ({
  page,
}) => {
  await page.goto("/actions?status=suggested&priority=urgent");
  await expect(
    page.getByRole("heading", { name: "Actions", exact: true }),
  ).toBeVisible();
  await expect(page.locator('select[name="status"]')).toHaveValue("suggested");
  await expect(page.locator('select[name="priority"]')).toHaveValue("urgent");
  await expect(
    page.getByRole("region", { name: "Organization actions" }),
  ).toBeVisible();
});

test("updates an action optimistically and persists the change", async ({
  page,
}) => {
  await page.goto("/actions");
  const priority = page.locator('select[aria-label^="Priority for"]').first();
  await expect(priority).toBeVisible();
  const priorityLabel = await priority.getAttribute("aria-label");
  if (!priorityLabel) throw new Error("Expected an action priority label.");
  const action = priority.locator("xpath=ancestor::*[@data-action-id]");
  const original = await priority.inputValue();
  const changed = original === "low" ? "normal" : "low";
  await priority.selectOption(changed);
  await expect(priority).toHaveValue(changed);
  await expect(action).toHaveAttribute("data-persisted-priority", changed);
  await page.reload();
  await expect(page.getByLabel(priorityLabel, { exact: true })).toHaveValue(
    changed,
  );
  const persistedPriority = page.getByLabel(priorityLabel, { exact: true });
  const persistedAction = persistedPriority.locator(
    "xpath=ancestor::*[@data-action-id]",
  );
  await persistedPriority.selectOption(original);
  await expect(persistedPriority).toHaveValue(original);
  await expect(persistedAction).toHaveAttribute(
    "data-persisted-priority",
    original,
  );
  await page.reload();
  await expect(page.getByLabel(priorityLabel, { exact: true })).toHaveValue(
    original,
  );
});

test("requires a reason before dismissing a brief risk", async ({ page }) => {
  await page.goto("/brief");
  const firstRisk = page.getByRole("article").first();
  await firstRisk.getByRole("button", { name: "Dismiss", exact: true }).click();
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
  await expect(firstRisk).toHaveAttribute(
    "data-acknowledgement-persisted",
    "true",
  );
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
  await page.getByRole("link", { name: "Recommended actions" }).click();
  await expect(
    page.getByRole("heading", { name: "Recommended actions" }),
  ).toBeVisible();
});

test("records a guided resolution and reopens it with a reason", async ({
  page,
}) => {
  test.slow();

  await page.goto("/brief");
  await page
    .getByRole("article")
    .nth(1)
    .getByRole("link", { name: "View full risk" })
    .click();
  await page.getByRole("link", { name: /Evidence/ }).click();
  await expect(
    page.getByRole("heading", { name: "Evidence-grounded explanation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ask Sightline" }).click();
  await page
    .getByRole("button", { name: "What evidence supports this?" })
    .click();
  await expect(
    page.getByRole("region", { name: "Sightline answer" }).last(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Recommended actions" }).click();
  const accept = page.getByRole("button", { name: "Accept", exact: true });
  if (await accept.isVisible()) {
    await accept.click();
    await expect(page.getByText("accepted", { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-action-id][data-pending="false"]').filter({
        hasText: "accepted",
      }),
    ).toBeVisible();
  }
  const owner = page
    .getByRole("region", { name: "Risk actions" })
    .getByRole("combobox", { name: "Owner" });
  await owner.selectOption("11000000-0000-4000-8000-000000000002");
  await expect(
    page.getByRole("region", { name: "Risk actions" }),
  ).toHaveAttribute(
    "data-persisted-owner-id",
    "11000000-0000-4000-8000-000000000002",
  );
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Risk actions" })
      .getByRole("combobox", { name: "Owner" }),
  ).toHaveValue("11000000-0000-4000-8000-000000000002");
  await page
    .getByRole("link", { name: "Draft email", exact: true })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /Draft/ })).toBeVisible();
  await page.goto("/risks/60000000-0000-4000-8000-000000000002");
  await page.getByRole("button", { name: "Resolve with details" }).click();
  const dialog = page.getByRole("dialog", { name: "Record what happened" });
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("Resolution summary")
    .fill(
      "The project team moved the concrete pour to a protected window and retained the crew reservation.",
    );
  await dialog.getByLabel("Resolution type").selectOption("prevented");
  await dialog.getByLabel("Approve a weather contingency plan").check();
  await dialog.getByLabel("Estimated remaining exposure").fill("1000");
  await dialog.getByLabel("Estimated loss avoided").fill("50000");
  await dialog.getByRole("button", { name: "Resolve risk" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByRole("link", { name: "Resolution state" }).click();
  await expect(
    page.getByText("Resolution summary", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("prevented", { exact: true })).toBeVisible();
  await page.goto("/risks?view=resolved");
  await expect(
    page.getByText("Forecast rain threatens Friday concrete placement", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Estimated resolution value" })
      .getByText("$85,000"),
  ).toBeVisible();
  await page.goto("/brief");
  await expect(page.getByRole("article")).toHaveCount(2);

  await page.goto("/risks/60000000-0000-4000-8000-000000000002");
  await page.getByRole("button", { name: "Reopen risk" }).click();
  await page
    .getByLabel("Reason for reopening")
    .fill(
      "The vendor reported that the approval does not cover the latest revision.",
    );
  await page.getByRole("button", { name: "Confirm reopening" }).click();
  await expect(page.getByLabel("Reason for reopening")).toBeHidden();
  await page.reload();
  await expect(page.getByText("action needed", { exact: true })).toBeVisible();
  await page.goto("/brief");
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("explains a risk with visibly grounded evidence", async ({ page }) => {
  await page.goto("/risks/60000000-0000-4000-8000-000000000001?tab=evidence");
  await expect(
    page.getByRole("heading", { name: "Evidence-grounded explanation" }),
  ).toBeVisible();
  await expect(
    page.getByText("Direct evidence", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Policy expiration: July 25, 2026"),
  ).toBeVisible();
  await expect(
    page.getByText("Source document is unavailable or archived."),
  ).toBeVisible();
});

test("asks a grounded risk question and records feedback", async ({ page }) => {
  await page.goto("/risks/60000000-0000-4000-8000-000000000001?tab=ask");
  await expect(page.getByLabel("Question about this risk")).toBeVisible();
  await page
    .getByLabel("Question about this risk")
    .fill("When does the insurance expire?");
  await page.getByRole("button", { name: "Ask Sightline" }).click();
  const answer = page.getByRole("region", { name: "Sightline answer" }).last();
  await expect(answer).toContainText("Policy expiration: July 25, 2026");
  await expect(answer).toContainText("Evidence citations");
  await answer.getByRole("button", { name: "Helpful", exact: true }).click();
  await expect(answer.getByRole("status")).toHaveText("Feedback saved.");
  await page.reload();
  await expect(
    page.getByText("Policy expiration: July 25, 2026").last(),
  ).toBeVisible();
});

test("edits and saves a human-controlled email draft", async ({ page }) => {
  await page.goto(
    "/risks/60000000-0000-4000-8000-000000000001/email-draft?draftId=a0000000-0000-4000-8000-000000000001",
  );
  if (
    await page
      .getByRole("heading", { name: "This page could not be found." })
      .isVisible()
  ) {
    await page.goto(
      "/risks/60000000-0000-4000-8000-000000000001/email-draft?actionId=80000000-0000-4000-8000-000000000001",
    );
    await page.getByRole("button", { name: "Generate editable draft" }).click();
    await expect(page).toHaveURL(/email-draft\?draftId=[0-9a-f-]+$/, {
      timeout: 30_000,
    });
  }
  await expect(
    page.getByRole("heading", { name: "Review email draft" }),
  ).toBeVisible();
  const subject = page.getByLabel("Email subject");
  const original = await subject.inputValue();
  await subject.fill("Updated certificate needed before mobilization");
  await page
    .getByLabel("Known contact")
    .selectOption("vendor:30000000-0000-4000-8000-000000000001");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toHaveText("Draft saved.");
  await page.reload();
  await expect(subject).toHaveValue(
    "Updated certificate needed before mobilization",
  );
  await subject.fill(original);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toHaveText("Draft saved.");
});

test("adds a risk comment with an organization-user mention", async ({
  page,
}) => {
  await page.goto("/risks/60000000-0000-4000-8000-000000000001");
  await page
    .getByLabel("Comment")
    .fill("Alex, please confirm the renewal certificate with Apex.");
  await page
    .getByLabel("Mention teammate")
    .selectOption({ label: "Alex Rivera" });
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByRole("status")).toHaveText("Comment added.");
  await page.reload();
  await expect(
    page
      .getByText("Alex, please confirm the renewal certificate with Apex.")
      .last(),
  ).toBeVisible();
});

test("shows the organization activity timeline", async ({ page }) => {
  await page.goto("/activity");
  await expect(
    page.getByRole("heading", { name: "Activity", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Alex, please confirm the renewal certificate with Apex.")
      .first(),
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
  await expect(page.getByRole("status")).toHaveText(
    "Document metadata updated.",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive document" }).click();
  await expect(page.getByRole("status")).toHaveText("Document archived.");
  await page.reload();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download file" })).toHaveCount(
    0,
  );
});

test("follows an executive priority and updates an overdue action", async ({
  page,
}) => {
  test.slow();

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, Matt." }),
  ).toBeVisible();
  const priorities = page.getByRole("region", { name: "Today’s priorities" });
  await priorities
    .getByRole("link", { name: /Open response|Review risk/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/risks\/[0-9a-f-]+/);

  await page.goto("/");
  const overdue = page.getByRole("region", { name: "Overdue actions" });
  const actionLink = overdue.getByRole("link").first();
  const actionTitle = await actionLink.textContent();
  await actionLink.click();
  await expect(page).toHaveURL(/\/risks\/[0-9a-f-]+/);

  await page.goto("/");
  const overdueAction = page
    .getByRole("region", { name: "Overdue actions" })
    .getByText(actionTitle ?? "", { exact: true })
    .locator("..");
  await overdueAction
    .getByLabel(`Due date for ${actionTitle ?? ""}`)
    .fill("2026-07-26");
  await expect(overdueAction.locator("[data-action-id]")).toHaveAttribute(
    "data-pending",
    "false",
    { timeout: 20_000 },
  );

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Overdue actions" })
      .getByText(actionTitle ?? "", { exact: true }),
  ).toHaveCount(0);
});
