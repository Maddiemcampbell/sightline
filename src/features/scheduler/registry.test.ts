import { describe, expect, it } from "vitest";

import { isValidCron } from "./cron";
import { SchedulerRegistry } from "./registry";
import type { RegisteredJob } from "./types";

const validJob = (key = "valid-job"): RegisteredJob => ({
  key,
  name: "Valid job",
  description: "Test",
  cron: "*/5 * * * *",
  enabled: true,
  timeoutMs: 1_000,
  retry: {
    maximumRetries: 1,
    backoffMs: 1_000,
    maximumBackoffMs: 10_000,
  },
  concurrency: "forbid",
  handler: async () => ({}),
});

describe("SchedulerRegistry", () => {
  it("registers valid jobs", () => {
    expect(new SchedulerRegistry([validJob()]).get("valid-job").key).toBe(
      "valid-job",
    );
  });

  it("rejects duplicate keys", () => {
    expect(() => new SchedulerRegistry([validJob(), validJob()])).toThrow(
      /Duplicate/,
    );
  });

  it("rejects invalid schedules", () => {
    expect(
      () => new SchedulerRegistry([{ ...validJob(), cron: "not a schedule" }]),
    ).toThrow(/invalid cron/);
  });

  it("rejects missing handlers", () => {
    expect(
      () =>
        new SchedulerRegistry([
          { ...validJob(), handler: undefined } as unknown as RegisteredJob,
        ]),
    ).toThrow(/no handler/);
  });

  it("rejects retry policies whose cap is below the initial backoff", () => {
    expect(
      () =>
        new SchedulerRegistry([
          {
            ...validJob(),
            retry: {
              maximumRetries: 1,
              backoffMs: 5_000,
              maximumBackoffMs: 1_000,
            },
          },
        ]),
    ).toThrow(/invalid configuration/);
  });

  it("validates supported five-field cron syntax", () => {
    expect(isValidCron("0 7 * * *")).toBe(true);
    expect(isValidCron("70 7 * * *")).toBe(false);
    expect(isValidCron("* * *")).toBe(false);
  });
});
