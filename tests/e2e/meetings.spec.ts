import { expect, test } from "@playwright/test";

test("prepares a meeting, records a decision, and creates follow-up work", async ({
  page,
}) => {
  await page.goto("/meetings");
  const main = page.locator("#main-content");
  await expect(
    main.getByRole("heading", { name: "Prepare meeting" }),
  ).toBeVisible();

  await main.getByLabel("Meeting name").fill("E2E leadership review");
  await main.getByLabel("Meeting type").selectOption("weekly_executive_review");
  await main.getByRole("button", { name: /Selected projects/ }).click();
  await main.getByText("Cedar Grove Medical Pavilion", { exact: true }).click();
  await main.getByRole("button", { name: "Build and review agenda" }).click();

  await expect(page).toHaveURL(/\/meetings\/[0-9a-f-]+$/);
  await expect(
    main.getByRole("heading", { name: "Generated agenda" }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", {
      name: "Cedar Grove Medical Pavilion",
      exact: true,
    }),
  ).toBeVisible();

  await main.getByRole("button", { name: "Generate briefing" }).click();
  await expect(main.getByText("Advisor draft", { exact: true })).toBeVisible();
  await expect(main.getByText(/Deterministic fallback/)).toBeVisible();
  await main
    .getByLabel(/Meeting notes/)
    .fill("Leadership agreed to escalate the insurance renewal today.");
  await main.getByRole("button", { name: "Draft outcomes from notes" }).click();
  await expect(
    main.getByRole("heading", { name: "Proposed decision" }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Proposed follow-up" }),
  ).toBeVisible();

  await main
    .getByLabel("Decision", { exact: true })
    .fill("Escalate the insurance renewal today.");
  await main
    .getByLabel("Project (optional)")
    .selectOption({ label: "Cedar Grove Medical Pavilion" });
  await main.getByRole("button", { name: "Record decision" }).click();
  await expect(main.getByRole("status")).toContainText("Decision recorded");
  await expect(
    main.getByText(/^1\. Escalate the insurance renewal today\.$/),
  ).toBeVisible();

  await main.getByLabel("Related risk").selectOption({ index: 1 });
  await main
    .getByLabel("Follow-up", { exact: true })
    .fill("Confirm renewed insurance certificate");
  await main
    .getByLabel("Definition of done")
    .fill("Renewed certificate is attached to the risk record.");
  await main.getByLabel("Owner").selectOption({ index: 1 });
  await main.getByLabel("Due date").fill("2026-08-21T17:00");
  await main.getByRole("button", { name: "Create follow-up action" }).click();
  await expect(
    main.getByText("Follow-up action created.", { exact: true }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Confirm renewed insurance certificate" }),
  ).toBeVisible();

  await main.getByLabel("Meeting outcomes have been recorded.").check();
  await main
    .getByLabel(
      "Accountability details are complete for every assigned action.",
    )
    .check();
  await main.getByRole("button", { name: "Complete meeting" }).click();
  await expect(main.getByText("Completed", { exact: true })).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Record decision" }),
  ).toHaveCount(0);
  await main.getByRole("button", { name: "Draft meeting recap" }).click();
  await expect(main.getByLabel("Subject")).toHaveValue(
    "Meeting recap: E2E leadership review",
  );
  const recap = main.getByLabel("Editable meeting recap email body");
  await expect(recap).toHaveValue(/Meeting details/);
  await expect(recap).toHaveValue(/Decisions/);
  await expect(recap).toHaveValue(/Follow-up actions/);
});
