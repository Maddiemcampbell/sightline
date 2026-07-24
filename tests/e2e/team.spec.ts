import { expect, test } from "@playwright/test";

test("shows the organization team management experience", async ({ page }) => {
  await page.goto("/settings/team");

  await expect(
    page.getByRole("heading", { name: "Team management" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(page.getByLabel("Search members")).toBeVisible();
  await expect(page.getByLabel("Filter by role")).toBeVisible();
  await expect(page.getByLabel("Sort members")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Members" })
      .getByText("e2e-owner@sightline.local"),
  ).toBeVisible();
  await expect(page.getByText("Owner", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pending invitations" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Invite a teammate" }),
  ).toBeVisible();
});

test("filters team members without a round trip", async ({ page }) => {
  await page.goto("/settings/team");
  await page.getByLabel("Search members").fill("no-such-member");
  await expect(
    page.getByRole("heading", { name: "No matching members" }),
  ).toBeVisible();
  await page.getByLabel("Search members").fill("e2e-owner");
  await expect(
    page
      .getByRole("region", { name: "Members" })
      .getByText("e2e-owner@sightline.local"),
  ).toBeVisible();
});
