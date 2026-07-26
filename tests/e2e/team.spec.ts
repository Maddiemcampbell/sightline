import { expect, test } from "@playwright/test";

test("shows the organization team management experience", async ({ page }) => {
  await page.goto("/settings/team");
  const main = page.locator("#main-content");

  await expect(
    main.getByRole("heading", { name: "Team management" }),
  ).toBeVisible();
  await expect(main.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(main.getByLabel("Search members")).toBeVisible();
  await expect(main.getByLabel("Filter by role")).toBeVisible();
  await expect(main.getByLabel("Sort members")).toBeVisible();
  await expect(
    main
      .getByRole("region", { name: "Members" })
      .getByText("e2e-owner@sightline.local"),
  ).toBeVisible();
  await expect(
    main
      .getByRole("region", { name: "Members" })
      .locator("span")
      .filter({ hasText: /^Owner$/ }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Pending invitations" }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Invite a teammate" }),
  ).toBeVisible();
});

test("filters team members without a round trip", async ({ page }) => {
  await page.goto("/settings/team");
  const main = page.locator("#main-content");
  const search = main.getByLabel("Search members");
  await search.fill("no-such-member");
  await expect(
    main.getByRole("heading", { name: "No matching members" }),
  ).toBeVisible();
  await search.fill("e2e-owner");
  await expect(
    main
      .getByRole("region", { name: "Members" })
      .getByText("e2e-owner@sightline.local"),
  ).toBeVisible();
});
