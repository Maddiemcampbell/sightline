import { expect, test } from "@playwright/test";

test("shows privacy retention controls and confirmed deletion workflows", async ({
  page,
}) => {
  await page.goto("/settings/privacy");
  const main = page.locator("#main-content");
  await expect(
    main.getByRole("heading", {
      name: "Your organization controls its data.",
    }),
  ).toBeVisible();
  await expect(
    main.getByText(
      "Customer data is never used to train foundation models without explicit permission.",
    ),
  ).toBeVisible();
  await expect(
    main.getByText("Customers retain ownership of their uploaded documents."),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Current AI processing policy" }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Organization export history" }),
  ).toBeVisible();
  const privacyPolicyResource = main
    .getByText("Privacy Policy", { exact: true })
    .locator("..");
  await expect(privacyPolicyResource).toContainText(
    "Placeholder · Counsel review required",
  );
  await expect(
    main.getByRole("heading", { name: "Data retention", exact: true }),
  ).toBeVisible();
  await expect(main.getByLabel("Deletion grace period")).toHaveValue("30");
  await expect(main.getByRole("heading", { name: "Legal hold" })).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Delete organization" }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Schedule organization deletion" }),
  ).toBeDisabled();
  await expect(
    main.getByRole("heading", { name: "Delete your account" }),
  ).toBeVisible();
});
