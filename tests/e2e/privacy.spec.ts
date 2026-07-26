import { expect, test } from "@playwright/test";

test("shows privacy retention controls and confirmed deletion workflows", async ({
  page,
}) => {
  await page.goto("/settings/privacy");
  await expect(
    page.getByRole("heading", { name: "Your organization controls its data." }),
  ).toBeVisible();
  await expect(
    page.locator("#main-content").getByText(
      "Customer data is never used to train foundation models without explicit permission.",
    ).first(),
  ).toBeVisible();
  await expect(
    page.locator("#main-content").getByText(
      "Customers retain ownership of their uploaded documents.",
    ).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current AI processing policy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Organization export history" }),
  ).toBeVisible();
  await expect(page.getByText("Privacy Policy", { exact: true })).toBeVisible();
  await expect(page.getByText("Counsel review required").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Data retention", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Deletion grace period")).toHaveValue("30");
  await expect(page.getByRole("heading", { name: "Legal hold" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Delete organization" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Schedule organization deletion" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Delete your account" }),
  ).toBeVisible();
});
