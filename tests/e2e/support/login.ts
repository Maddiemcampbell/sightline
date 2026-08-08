import type { Page } from "@playwright/test";

const LOGIN_READY_TIMEOUT_MS = 45_000;
const ATTEMPT_TIMEOUT_MS = 5_000;

export async function loginWithAuthReadiness({
  page,
  email,
  password,
  destination,
}: {
  page: Page;
  email: string;
  password: string;
  destination: string;
}) {
  const loginPath = `/login${
    destination === "/" ? "" : `?next=${encodeURIComponent(destination)}`
  }`;
  await page.goto(loginPath);
  const deadline = Date.now() + LOGIN_READY_TIMEOUT_MS;
  let delay = 250;
  let lastMessage = "The login form did not return an error.";

  while (Date.now() < deadline) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    try {
      await page.waitForURL((url) => url.pathname === destination, {
        timeout: Math.max(
          1,
          Math.min(ATTEMPT_TIMEOUT_MS, deadline - Date.now()),
        ),
      });
      return;
    } catch {
      if (new URL(page.url()).pathname !== "/login") {
        throw new Error(
          `Login navigated to an unexpected destination: ${page.url()}`,
        );
      }
      lastMessage =
        (await page
          .getByRole("status")
          .textContent({ timeout: 500 })
          .catch(() => null)) ?? lastMessage;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await page.waitForTimeout(Math.min(delay, remaining));
    delay = Math.min(delay * 2, 5_000);
  }

  throw new Error(
    `The E2E Auth user was not ready for password login within ${LOGIN_READY_TIMEOUT_MS}ms. Last application message: ${lastMessage}`,
  );
}
