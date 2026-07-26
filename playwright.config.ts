import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const authState = "test-results/e2e-auth.json";
const platformAuthState = "test-results/e2e-platform-auth.json";

export default defineConfig({
  testDir: "./tests/e2e",
  // These end-to-end flows intentionally share the deterministic local seed.
  // Run files in parallel when more suites are added, but keep tests within a
  // file serial so one mutation cannot invalidate another test's read model.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "platform-setup",
      testMatch: /platform-admin\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: [
        /auth\.setup\.ts/,
        /platform-admin\.setup\.ts/,
        /platform-admin\.spec\.ts/,
      ],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        storageState: authState,
      },
    },
    {
      name: "platform-chromium",
      dependencies: ["setup", "platform-setup"],
      testMatch: /platform-admin\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        storageState: platformAuthState,
      },
    },
  ],
  webServer: {
    command:
      "APP_URL=http://127.0.0.1:3100 SIGHTLINE_E2E=true npm run build -- --webpack && APP_URL=http://127.0.0.1:3100 SIGHTLINE_E2E=true npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
  },
});
