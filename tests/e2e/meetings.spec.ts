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
  await main.getByText("Cedar Grove Medical Pavilion", { exact: true }).click();
  await main.getByRole("button", { name: "Generate agenda" }).click();

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

  await main
    .getByLabel("Decision")
    .fill("Escalate the insurance renewal today.");
  await main
    .getByLabel("Project (optional)")
    .selectOption({ label: "Cedar Grove Medical Pavilion" });
  await main.getByRole("button", { name: "Record decision" }).click();
  await expect(main.getByRole("status")).toContainText("Decision recorded");
  await expect(
    main.getByText("Escalate the insurance renewal today."),
  ).toBeVisible();

  await main.getByLabel("Related risk").selectOption({ index: 1 });
  await main
    .getByLabel("Follow-up")
    .fill("Confirm renewed insurance certificate");
  await main
    .getByLabel("Definition of done")
    .fill("Renewed certificate is attached to the risk record.");
  await main.getByLabel("Owner").selectOption({ index: 1 });
  await main.getByRole("button", { name: "Create follow-up action" }).click();
  await expect(
    main.getByText("Follow-up action created.", { exact: true }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Confirm renewed insurance certificate" }),
  ).toBeVisible();

  await main.getByRole("button", { name: "Complete meeting" }).click();
  await expect(main.getByText("Completed", { exact: true })).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Record decision" }),
  ).toHaveCount(0);
});
