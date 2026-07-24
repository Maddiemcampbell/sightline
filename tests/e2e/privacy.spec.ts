import { expect, test } from "@playwright/test";

test("shows privacy retention controls and confirmed deletion workflows", async ({
  page,
}) => {
  await page.goto("/settings/privacy");
  await expect(
    page.getByRole("heading", { name: "Data retention" }),
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
