import { expect, test } from "@playwright/test";

test("serves twenty concurrent authenticated dashboard requests without timing out", async ({
  request,
}, testInfo) => {
  const startedAt = Date.now();
  const measurements = await Promise.all(
    Array.from({ length: 20 }, async (_, index) => {
      const requestStartedAt = Date.now();
      const response = await request.get("/", { timeout: 30_000 });
      return {
        request: index + 1,
        status: response.status(),
        durationMs: Date.now() - requestStartedAt,
      };
    }),
  );
  const durations = measurements
    .map((measurement) => measurement.durationMs)
    .toSorted((left, right) => left - right);
  const report = {
    concurrency: measurements.length,
    wallClockMs: Date.now() - startedAt,
    minimumMs: durations[0] ?? null,
    medianMs: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    maximumMs: durations.at(-1) ?? null,
    requests: measurements,
  };
  await testInfo.attach("dashboard-load-measurements.json", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });

  expect(measurements).toHaveLength(20);
  expect(
    measurements.filter((measurement) => measurement.status !== 200),
  ).toEqual([]);
});

function percentile(values: readonly number[], value: number) {
  if (!values.length) return null;
  return values[Math.ceil(values.length * value) - 1] ?? values.at(-1) ?? null;
}
