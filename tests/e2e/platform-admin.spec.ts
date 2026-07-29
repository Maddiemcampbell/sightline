import { createHmac } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { ensureE2eAuthUser } from "./support/auth-users";

test("redirects the legacy platform admin path to the protected console", async ({
  page,
}) => {
  await page.goto("/platform-admin");
  await expect(page).toHaveURL("/internal/admin");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
});

const organizationId = "10000000-0000-4000-8000-000000000001";
const limitedEmail = "e2e-limited-platform-operator@sightline.local";
const limitedPassword = "Sightline-Limited-Platform-E2E-2026!";
const limitedAuthUserId = "12000000-0000-4000-8000-000000000004";
const operatorEmail = "e2e-platform-operator@sightline.local";
const operatorPassword = "Sightline-Platform-E2E-2026!";

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used by the platform E2E assertions.");
  }
}

test("shows content-free customer health metrics", async ({ page }) => {
  await page.goto("/internal/admin/customer-health");
  await expect(
    page.getByRole("heading", { name: "Customer health" }),
  ).toBeVisible();
  await expect(page.getByText("BuildCo Construction")).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Last login" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Onboarding" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Feature adoption" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Job failures (30d)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Activity (30d)" }),
  ).toBeVisible();
});

test("searches and inspects connected customer records with an audit trail", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/internal/admin/organizations");
  await expect(
    page.getByRole("heading", { name: "Organizations" }),
  ).toBeVisible();
  await expect(page.getByText("BuildCo Construction")).toBeVisible();
  const organizationLink = page.getByRole("link", {
    name: "BuildCo Construction",
  });
  const organizationHref = await organizationLink.getAttribute("href");
  expect(organizationHref).toBe(
    `/internal/admin/organizations/${organizationId}`,
  );
  await page.goto(organizationHref!);
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
  const userHref = await userLink.getAttribute("href");
  expect(userHref).toMatch(/\/internal\/admin\/users\/[0-9a-f-]+$/);
  await page.goto(userHref!);
  await expect(page).toHaveURL(/\/internal\/admin\/users\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "Organization memberships" }),
  ).toBeVisible({ timeout: 15_000 });

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
  const authUserId = await ensureE2eAuthUser({
    admin,
    id: limitedAuthUserId,
    email: limitedEmail,
    password: limitedPassword,
  });
  const { data: operator, error: operatorError } = await admin
    .from("platform_operators")
    .upsert(
      {
        auth_user_id: authUserId,
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

test("views and filters centralized background-job execution history", async ({
  page,
}) => {
  await page.goto("/internal/admin/jobs");
  await expect(
    page.getByRole("heading", { name: "Background jobs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Execution history", exact: true }),
  ).toBeVisible();
  const filters = page.getByRole("form", {
    name: "Execution history filters",
  });
  await filters.getByLabel("Trigger source").selectOption("retry");
  await filters.getByLabel("Execution status").selectOption("dead_lettered");
  await filters.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/historyTrigger=retry/);
  await expect(page).toHaveURL(/historyStatus=dead_lettered/);
  await expect(
    page.getByText(/executions|No execution history found/).last(),
  ).toBeVisible();
});

test("renders production-backed operational console destinations", async ({
  page,
}) => {
  for (const [path, heading] of [
    ["/internal/admin/errors", "Production errors"],
    ["/internal/admin/ai", "AI usage"],
    ["/internal/admin/system", "System health"],
    ["/internal/admin/audit", "Platform audit log"],
    ["/internal/admin/operators", "Platform operators"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("investigates a redacted error with related context and occurrences", async ({
  page,
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase E2E environment is unavailable.");
  const admin = adminClient(url, key);
  const id = crypto.randomUUID();
  const similarId = crypto.randomUUID();
  const releaseId = crypto.randomUUID();
  const occurredAt = new Date().toISOString();
  const { data: user, error: userError } = await admin
    .from("users")
    .select("id,auth_user_id")
    .eq("id", "11000000-0000-4000-8000-000000000001")
    .single();
  if (userError) throw new Error(userError.message);
  const release = await admin.from("releases").insert({
    id: releaseId,
    release_identifier: `e2e-${releaseId}`,
    application_version: "e2e-error-release",
    environment: "test",
    status: "deployed",
    deployed_at: occurredAt,
    release_notes: "Error investigation fixture.",
  });
  if (release.error) throw new Error(release.error.message);
  const reports = await admin
    .from("application_error_reports")
    .insert([
      errorFixture(id, occurredAt, user.auth_user_id),
      errorFixture(
        similarId,
        new Date(Date.now() - 60_000).toISOString(),
        user.auth_user_id,
      ),
    ]);
  if (reports.error) throw new Error(reports.error.message);

  await page.goto(`/internal/admin/errors/${id}`);
  await expect(
    page.getByRole("heading", { name: "E2EInvestigationError" }),
  ).toBeVisible();
  await expect(page.getByText("retryCount")).toBeVisible();
  await expect(page.getByText("stack fixture")).toBeVisible();
  await expect(page.getByText("BuildCo Construction")).toBeVisible();
  await expect(
    page.getByRole("link", { name: `e2e-${releaseId}` }),
  ).toBeVisible();
  await expect(page.getByText("Similar occurrences (1)")).toBeVisible();
});

test("enforces and completes MFA enrollment for a required operator", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase E2E environment is unavailable.");
  const admin = adminClient(url, key);
  const { data: operator, error } = await admin
    .from("platform_operators")
    .select("id,auth_user_id")
    .eq("email", "e2e-platform-operator@sightline.local")
    .single();
  if (error) throw new Error(error.message);
  const existing = await admin.auth.admin.mfa.listFactors({
    userId: operator.auth_user_id,
  });
  if (existing.error) throw new Error(existing.error.message);
  for (const factor of existing.data.factors) {
    const removed = await admin.auth.admin.mfa.deleteFactor({
      userId: operator.auth_user_id,
      id: factor.id,
    });
    if (removed.error) throw new Error(removed.error.message);
  }
  // Removing a verified factor invalidates the current Auth session. Start from
  // a fresh AAL1 session before enabling the platform MFA policy.
  await page.context().clearCookies();
  await page.goto("/login?next=%2Finternal%2Fadmin");
  await page.getByLabel("Email").fill(operatorEmail);
  await page.getByLabel("Password").fill(operatorPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/internal/admin");
  const required = await admin
    .from("platform_operators")
    .update({ mfa_required: true })
    .eq("id", operator.id);
  if (required.error) throw new Error(required.error.message);
  try {
    await page.goto("/internal/admin");
    await expect(page).toHaveURL(/\/platform-auth\/mfa/);
    await expect(
      page.getByRole("heading", { name: "Secure your operator account" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Set up authenticator" }).click();
    await expect(
      page.getByAltText("Authenticator enrollment QR code"),
    ).toBeVisible();
    const secret = (await page.locator("code").innerText()).trim();
    await page.getByLabel("Six-digit authentication code").fill(totp(secret));
    await page.getByRole("button", { name: "Verify and continue" }).click();
    const rejected = page.getByText("That code was not accepted. Try again.", {
      exact: true,
    });
    if (
      new URL(page.url()).pathname === "/platform-auth/mfa" &&
      (await rejected.isVisible())
    ) {
      await page.getByLabel("Six-digit authentication code").fill(totp(secret));
      await page.getByRole("button", { name: "Verify and continue" }).click();
    }
    await expect(page).toHaveURL("/internal/admin");
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
  } finally {
    await admin
      .from("platform_operators")
      .update({ mfa_required: false })
      .eq("id", operator.id);
    // Keep the verified synthetic factor. Deleting a verified factor revokes
    // the active session and can stall Auth cleanup; the next run removes any
    // stale factors before establishing its fresh AAL1 session.
  }
});

function errorFixture(
  id: string,
  occurredAt: string,
  authUserId: string | null,
) {
  return {
    id,
    source: "server" as const,
    severity: "error" as const,
    environment: "test",
    application_version: "e2e-error-release",
    error_name: "E2EInvestigationError",
    error_message: "A sanitized investigation fixture failed.",
    stack_trace: "Error: stack fixture\\n at safe/service.ts:10:2",
    request_path: "/brief",
    request_method: "GET",
    request_id: crypto.randomUUID(),
    correlation_id: crypto.randomUUID(),
    auth_user_id: authUserId,
    application_user_id: "11000000-0000-4000-8000-000000000001",
    organization_id: "10000000-0000-4000-8000-000000000001",
    user_agent: "Playwright fixture",
    browser_context: { browser: "chromium" },
    safe_metadata: { retryCount: 2 },
    occurred_at: occurredAt,
  };
}

function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret.replaceAll("=", "").toUpperCase())
    bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const key = Buffer.from(
    bits.match(/.{8}/g)?.map((byte) => Number.parseInt(byte, 2)) ?? [],
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

function adminClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: UnusedWebSocketTransport as never },
  });
}
