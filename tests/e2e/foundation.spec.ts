import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used by foundation tests.");
  }
}

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
  const main = page.locator("#main-content");
  await expect(main.locator('select[name="status"]')).toHaveValue("suggested");
  await expect(main.locator('select[name="priority"]')).toHaveValue("urgent");
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
  const main = page.locator("#main-content");
  await main.getByLabel("Search projects").fill("Medical");
  await main.getByRole("button", { name: "Apply" }).click();

  await expect(page).toHaveURL(/projects\?q=Medical/);
  await expect(main.getByRole("heading", { name: /Medical/ })).toBeVisible();
});

test("opens a risk detail with evidence and actions", async ({ page }) => {
  await page.goto("/risks");
  await page.getByRole("link", { name: "View risk" }).first().click();

  await expect(page).toHaveURL(/\/risks\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Evidence" })).toBeVisible();
  const actionsLink = page.getByRole("link", { name: "Recommended actions" });
  const actionsHref = await actionsLink.getAttribute("href");
  expect(actionsHref).toMatch(/\?tab=actions$/);
  await page.goto(actionsHref!);
  await expect(page).toHaveURL(/\?tab=actions$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Recommended actions" }),
  ).toBeVisible({ timeout: 15_000 });
});

test("records a guided resolution and reopens it with a reason", async ({
  page,
}) => {
  test.slow();

  await page.goto("/risks/60000000-0000-4000-8000-000000000002?tab=evidence");
  await expect(page).toHaveURL(/\?tab=evidence$/);
  await expect(
    page.getByRole("heading", { name: "Evidence-grounded explanation" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: "Ask Sightline" }).click();
  const riskQuestion = page
    .locator("#main-content")
    .getByLabel("Question about this risk");
  await riskQuestion.fill("What evidence supports this?");
  await page
    .locator("#main-content")
    .getByRole("button", { name: "Ask Sightline" })
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
  const resolutionLink = page.getByRole("link", { name: "Resolution state" });
  const resolutionHref = await resolutionLink.getAttribute("href");
  expect(resolutionHref).toMatch(/\?tab=resolution$/);
  await page.goto(resolutionHref!);
  await expect(page).toHaveURL(/\?tab=resolution$/, { timeout: 15_000 });
  const resolutionContent = page.locator("#main-content");
  await expect(
    resolutionContent.getByText("Resolution summary", { exact: true }),
  ).toBeVisible();
  await expect(
    resolutionContent.getByText("prevented", { exact: true }),
  ).toBeVisible();
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
  await expect(
    page.locator("#main-content").getByText("action needed", { exact: true }),
  ).toBeVisible();
  await page.goto("/brief");
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("explains a risk with visibly grounded evidence", async ({ page }) => {
  await page.goto("/risks/60000000-0000-4000-8000-000000000001?tab=evidence");
  const main = page.locator("#main-content");
  await expect(
    main.getByRole("heading", { name: "Evidence-grounded explanation" }),
  ).toBeVisible();
  await expect(
    main.getByText("Direct evidence", { exact: true }),
  ).toBeVisible();
  await expect(
    main.getByText("Policy expiration: July 25, 2026"),
  ).toBeVisible();
  await expect(
    main.getByText("Source document is unavailable or archived."),
  ).toBeVisible();
});

test("asks a grounded risk question and records feedback", async ({ page }) => {
  await page.goto("/risks/60000000-0000-4000-8000-000000000001?tab=ask");
  const main = page.locator("#main-content");
  const question = main.getByLabel("Question about this risk");
  await expect(question).toBeVisible();
  await question.fill("When does the insurance expire?");
  await main.getByRole("button", { name: "Ask Sightline" }).click();
  const answer = main.getByRole("region", { name: "Sightline answer" }).last();
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
  const subject = page.locator("#main-content").getByLabel("Email subject");
  const main = page.locator("#main-content");
  const original = await subject.inputValue();
  await subject.fill("Updated certificate needed before mobilization");
  await main
    .getByLabel("Known contact")
    .selectOption("vendor:30000000-0000-4000-8000-000000000001");
  await main.getByRole("button", { name: "Save draft" }).click();
  await expect(main.getByRole("status")).toHaveText("Draft saved.");
  await page.reload();
  await expect(subject).toHaveValue(
    "Updated certificate needed before mobilization",
  );
  await subject.fill(original);
  await main.getByRole("button", { name: "Save draft" }).click();
  await expect(main.getByRole("status")).toHaveText("Draft saved.");
});

test("adds a risk comment with an organization-user mention", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/risks/60000000-0000-4000-8000-000000000001");
  const main = page.locator("#main-content");
  const comment = main.getByLabel("Comment");
  await comment.fill("@al");
  await main
    .getByRole("option", { name: /Alex Rivera.*@alex\.rivera/ })
    .click();
  await comment.pressSequentially(
    "please confirm the renewal certificate with Apex.",
  );
  const submit = main.getByRole("button", { name: "Comment", exact: true });
  await submit.click();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error("Supabase E2E environment is not configured.");
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: UnusedWebSocketTransport as never },
  });
  let savedCommentId = "";
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("collaboration_comments")
          .select("id")
          .eq("subject_id", "60000000-0000-4000-8000-000000000001")
          .ilike("body_markdown", "%confirm the renewal certificate%")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        savedCommentId = data?.id ?? "";
        return savedCommentId;
      },
      { timeout: 20_000 },
    )
    .not.toBe("");
  await expect
    .poll(
      async () => {
        const { count } = await admin
          .from("comment_mentions")
          .select("*", { count: "exact", head: true })
          .eq("comment_id", savedCommentId);
        return count ?? 0;
      },
      { timeout: 20_000 },
    )
    .toBe(1);
  await page.reload();
  const savedComment = main
    .getByRole("list", { name: "Comments" })
    .getByRole("listitem")
    .filter({ hasText: "please confirm the renewal certificate with Apex." });
  await expect(savedComment).toBeVisible({ timeout: 20_000 });
  await expect(savedComment.getByText("@alex.rivera")).toBeVisible();
});

test("shows the organization activity timeline", async ({ page }) => {
  await page.goto("/activity");
  const main = page.locator("#main-content");
  await expect(
    main.getByRole("heading", { name: "Activity", exact: true }),
  ).toBeVisible();
  await expect(
    main.getByText("Seed email draft created for human review."),
  ).toBeVisible();
  await expect(page.getByText("System", { exact: true }).last()).toBeVisible();
});

test("shows the secure document upload workflow", async ({ page }) => {
  await page.goto("/documents");
  const main = page.locator("#main-content");

  await expect(
    main.getByRole("heading", { name: "Upload source document" }),
  ).toBeVisible();
  await expect(main.getByLabel("File")).toHaveAttribute(
    "accept",
    ".pdf,.docx,.csv,.jpg,.jpeg,.png",
  );
  await expect(
    main.getByRole("heading", { name: "Document library" }),
  ).toBeVisible();
});

test("uploads, edits, and archives document metadata", async ({ page }) => {
  await page.goto("/documents");
  const main = page.locator("#main-content");
  await main.getByLabel("File").setInputFiles({
    name: "weekly-log.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await main.getByLabel("Display name").fill("Weekly field log");
  await main.getByLabel("Category").selectOption("daily_log");
  const uploadResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/documents") &&
      response.request().method() === "POST",
  );
  await main.getByRole("button", { name: "Upload document" }).click();
  const response = await uploadResponse;
  expect(response.status()).toBe(201);
  const payload = (await response.json()) as { documentId?: string };
  expect(payload.documentId).toMatch(/^[0-9a-f-]{36}$/);
  if (!payload.documentId) throw new Error("Upload returned no document ID.");
  await page.goto(`/documents/${payload.documentId}`);
  await main.getByLabel("Display name").fill("Weekly field log — reviewed");
  await main.getByRole("button", { name: "Save metadata" }).click();
  await expect(main.getByRole("status")).toHaveText(
    "Document metadata updated.",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await main.getByRole("button", { name: "Archive document" }).click();
  await expect(main.getByRole("status")).toHaveText("Document archived.");
  await page.reload();
  await expect(main.getByText("Archived", { exact: true })).toBeVisible();
  await expect(main.getByRole("link", { name: "Download file" })).toHaveCount(
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
  const recommendations = page.getByRole("region", {
    name: "Executive Recommendations",
  });
  await recommendations.getByRole("link", { name: "Review" }).first().click();
  await expect(page).toHaveURL(/\/(?:projects|risks)\/[0-9a-f-]+/);

  await page.goto("/actions?due=overdue");
  const actions = page.getByRole("region", { name: "Organization actions" });
  const firstDueDate = actions
    .locator('input[aria-label^="Due date for"]')
    .first();
  await expect(firstDueDate).toBeVisible();
  const dueDateLabel = await firstDueDate.getAttribute("aria-label");
  if (!dueDateLabel)
    throw new Error("Expected an overdue action due-date label.");
  const actionTitle = dueDateLabel.replace(/^Due date for /, "");
  const actionItem = firstDueDate.locator("xpath=ancestor::li");
  await actionItem.getByRole("link", { name: /.+/ }).first().click();
  await expect(page).toHaveURL(/\/risks\/[0-9a-f-]+/);

  await page.goto("/actions?due=overdue");
  const overdueDueDate = page.getByLabel(`Due date for ${actionTitle}`, {
    exact: true,
  });
  const futureDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 10);
  await overdueDueDate.fill(futureDueDate);
  await expect
    .poll(
      async () => {
        const current = page.getByLabel(`Due date for ${actionTitle}`, {
          exact: true,
        });
        if ((await current.count()) === 0) return "settled";
        const action = current.locator("xpath=ancestor::*[@data-action-id]");
        return (await action.getAttribute("data-pending")) === "false" &&
          (await current.inputValue()) === futureDueDate
          ? "settled"
          : "pending";
      },
      { timeout: 20_000 },
    )
    .toBe("settled");

  await page.reload();
  await expect(
    page.getByLabel(`Due date for ${actionTitle}`, { exact: true }),
  ).toHaveCount(0);
});
