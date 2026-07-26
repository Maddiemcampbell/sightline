import { expect, test } from "@playwright/test";

test("does not disclose the staff console to customer organization owners", async ({
  page,
}) => {
  for (const path of [
    "/internal/admin/organizations",
    "/internal/admin/organizations/10000000-0000-4000-8000-000000000001",
    "/internal/admin/users",
    "/internal/admin/users/12000000-0000-4000-8000-000000000001",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
