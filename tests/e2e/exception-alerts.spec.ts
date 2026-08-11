import { expect, test } from "@playwright/test";

test("configures and evaluates proactive business exceptions", async ({
  page,
}) => {
  await page.goto("/settings/notifications");

  await expect(
    page.getByRole("heading", { name: "Active exceptions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Business exception thresholds" }),
  ).toBeVisible();

  const thresholdCard = page
    .getByRole("heading", { name: "Business exception thresholds" })
    .locator("..");
  await thresholdCard.getByLabel("Minimum forecast margin (%)").fill("8");
  await thresholdCard
    .getByRole("button", { name: "Save exception thresholds" })
    .click();
  await expect(thresholdCard.getByRole("status")).toHaveText(
    "Exception thresholds saved.",
  );

  await page.getByRole("button", { name: "Check now" }).click();
  const activeCard = page.getByTestId("active-exceptions");
  await expect(activeCard.locator("li").first()).toBeVisible();
});
