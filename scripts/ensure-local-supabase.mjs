import { spawnSync } from "node:child_process";

const apiUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"
).replace(/\/$/, "");
const authHealthUrl = `${apiUrl}/auth/v1/health`;

if (!(await waitForAuth(20_000))) {
  console.warn(
    "Local Supabase Auth remained unhealthy after reset; restarting the local stack once.",
  );
  runNpmScript("db:stop");
  runNpmScript("db:start");
  if (!(await waitForAuth(60_000))) {
    throw new Error(
      `Local Supabase Auth is still unhealthy at ${authHealthUrl} after a stack restart. Check Docker resources and Auth container logs.`,
    );
  }
}

console.log("Local Supabase Auth health check passed.");

async function waitForAuth(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "unreachable";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(authHealthUrl, {
        signal: AbortSignal.timeout(3_000),
      });
      lastStatus = String(response.status);
      if (response.ok) return true;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : "unreachable";
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  console.warn(`Supabase Auth health check failed (${lastStatus}).`);
  return false;
}

function runNpmScript(script) {
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(executable, ["run", script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`npm run ${script} failed with status ${result.status}.`);
  }
}
