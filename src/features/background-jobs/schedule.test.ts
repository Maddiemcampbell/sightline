import { describe, expect, it } from "vitest";

import {
  organizationJobRetryAt,
  scheduledOrganizationJob,
} from "@/features/background-jobs/schedule";

const BASE = {
  organizationId: "organization-a",
  jobType: "portfolio_refresh" as const,
  enabled: true,
  timezone: "America/Los_Angeles",
};

describe("scheduled organization jobs", () => {
  it("does not enqueue work before the organization-local scheduled time", () => {
    expect(
      scheduledOrganizationJob({
        ...BASE,
        localTime: "07:00",
        now: new Date("2026-07-26T13:59:00.000Z"),
      }),
    ).toBeNull();
  });

  it("creates one deterministic daily idempotency key after the due time", () => {
    expect(
      scheduledOrganizationJob({
        ...BASE,
        localTime: "07:00",
        now: new Date("2026-07-26T14:05:00.000Z"),
      }),
    ).toMatchObject({
      idempotencyKey: "scheduled/2026-07-26",
      localDate: "2026-07-26",
    });
  });

  it("does not enqueue disabled schedules", () => {
    expect(
      scheduledOrganizationJob({
        ...BASE,
        enabled: false,
        localTime: "00:00",
        now: new Date("2026-07-26T20:00:00.000Z"),
      }),
    ).toBeNull();
  });

  it("uses each organization's timezone when deriving the delivery date", () => {
    expect(
      scheduledOrganizationJob({
        ...BASE,
        timezone: "Pacific/Auckland",
        localTime: "07:00",
        now: new Date("2026-07-26T20:00:00.000Z"),
      }),
    ).toMatchObject({
      idempotencyKey: "scheduled/2026-07-27",
      localDate: "2026-07-27",
    });
  });

  it("backs retries off and stops at the configured attempt limit", () => {
    const now = new Date("2026-07-26T20:00:00.000Z");
    expect(organizationJobRetryAt(now, 2, 3)).toBe(
      "2026-07-26T20:30:00.000Z",
    );
    expect(organizationJobRetryAt(now, 3, 3)).toBeNull();
  });
});
