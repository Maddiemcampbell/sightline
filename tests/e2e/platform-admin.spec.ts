import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const organizationId = "10000000-0000-4000-8000-000000000001";
const limitedEmail = "e2e-limited-platform-operator@sightline.local";
const limitedPassword = "Sightline-Limited-Platform-E2E-2026!";

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used by the platform E2E assertions.");
  }
}

test("searches and inspects connected customer records with an audit trail", async ({
  page,
}) => {
  await page.goto("/internal/admin/organizations");
  await expect(
    page.getByRole("heading", { name: "Organizations" }),
  ).toBeVisible();
  await expect(page.getByText("BuildCo Construction")).toBeVisible();
  await page.getByRole("link", { name: "BuildCo Construction" }).click();
  await expect(page).toHaveURL(
    `/internal/admin/organizations/${organizationId}`,
  );
  await expect(
    page.getByRole("heading", { name: "Members and invitations" }),
  ).toBeVisible({ timeout: 15_000 });

  const userLink = page
    .getByRole("link", { name: /Matt Anderson|Alex Rivera|Name unavailable/ })
    .first();
  await expect(userLink).toBeVisible();
  await userLink.click();
  await expect(page).toHaveURL(/\/internal\/admin\/users\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "Organization memberships" }),
  ).toBeVisible();

  const search = page.getByRole("search");
  await search.getByRole("searchbox").fill("BuildCo");
  const searchControl = search.locator("..");
  await expect(
    searchControl.getByText("Customer directory results"),
  ).toBeVisible();
  await expect(
    searchControl.getByRole("link", {
      name: /BuildCo Construction organization/,
    }),
  ).toBeVisible();

  await expect
    .poll(async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return 0;
      const admin = adminClient(url, key);
      const { count, error } = await admin
        .from("platform_audit_logs")
        .select("id", { count: "exact", head: true })
        .in("action", [
          "platform.organization.view",
          "platform.user.view",
          "platform.customer.search",
        ]);
      if (error) throw new Error(error.message);
      return count ?? 0;
    })
    .toBeGreaterThanOrEqual(3);
});

test("denies and audits an active operator without directory capabilities", async ({
  page,
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase E2E environment is unavailable.");
  const admin = adminClient(url, key);
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });
  if (listError) throw new Error(listError.message);
  const existing = listed.users.find(
    (candidate) => candidate.email?.toLowerCase() === limitedEmail,
  );
  const authResult = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
        email: limitedEmail,
        password: limitedPassword,
        email_confirm: true,
      })
    : await admin.auth.admin.createUser({
        email: limitedEmail,
        password: limitedPassword,
        email_confirm: true,
      });
  if (authResult.error || !authResult.data.user)
    throw new Error(
      authResult.error?.message ?? "Limited operator user is unavailable.",
    );
  const { data: operator, error: operatorError } = await admin
    .from("platform_operators")
    .upsert(
      {
        auth_user_id: authResult.data.user.id,
        email: limitedEmail,
        display_name: "Limited E2E Operator",
        status: "active",
      },
      { onConflict: "auth_user_id" },
    )
    .select("id")
    .single();
  if (operatorError) throw new Error(operatorError.message);
  const { error: revokeError } = await admin
    .from("platform_operator_permissions")
    .delete()
    .eq("operator_id", operator.id);
  if (revokeError) throw new Error(revokeError.message);
  const { error: grantError } = await admin
    .from("platform_operator_permissions")
    .upsert(
      {
        operator_id: operator.id,
        permission: "platform.dashboard.read",
      },
      { onConflict: "operator_id,permission" },
    );
  if (grantError) throw new Error(grantError.message);

  await page.context().clearCookies();
  await page.goto("/login?next=%2Finternal%2Fadmin%2Forganizations");
  await page.getByLabel("Email").fill(limitedEmail);
  await page.getByLabel("Password").fill(limitedPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/internal\/admin\/organizations$/);

  await expect
    .poll(async () => {
      const { count, error } = await admin
        .from("platform_audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("operator_id", operator.id)
        .eq("outcome", "denied");
      if (error) throw new Error(error.message);
      return count ?? 0;
    })
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: "Organizations", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("BuildCo Construction")).toHaveCount(0);
});

function adminClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: UnusedWebSocketTransport as never },
  });
}
