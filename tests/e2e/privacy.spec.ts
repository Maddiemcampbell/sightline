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
    main.getByRole("heading", { name: "AI processing controls" }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Organization export history" }),
  ).toBeVisible();
  await expect(main.getByText(/placeholder/i)).toHaveCount(0);
  await expect(main.getByText(/not yet published/i)).toHaveCount(0);
  await expect(main.getByText(/pending legal approval/i)).toHaveCount(0);
  await expect(main.getByText("Privacy Policy", { exact: true })).toHaveCount(
    0,
  );
  await expect(main.getByText("Terms of Service", { exact: true })).toHaveCount(
    0,
  );
  await expect(main.getByText("Documents under review")).toHaveCount(0);
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
