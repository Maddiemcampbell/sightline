import { describe, expect, it } from "vitest";

import {
  dataExportRetryAt,
  scheduledDataExportOccurrence,
  type DataExportScheduleConfiguration,
} from "@/features/data-exports/schedule";
import { dataExportScheduleSchema } from "@/features/data-exports/schedule-validation";

const schedule: DataExportScheduleConfiguration = {
  id: "schedule-1",
  organizationId: "org-1",
  enabled: true,
  cadence: "weekly",
  localTime: "06:00",
  weekday: 1,
  dayOfMonth: 15,
  timezone: "America/Los_Angeles",
};

describe("scheduled data exports", () => {
  it("queues a weekly occurrence only after the configured local time and day", () => {
    expect(
      scheduledDataExportOccurrence(
        schedule,
        new Date("2026-07-27T12:59:00.000Z"),
      ),
    ).toBeNull();
    expect(
      scheduledDataExportOccurrence(
        schedule,
        new Date("2026-07-27T13:01:00.000Z"),
      ),
    ).toEqual({
      occurrenceKey: "weekly/2026-07-27",
      localDate: "2026-07-27",
    });
    expect(
      scheduledDataExportOccurrence(
        schedule,
        new Date("2026-07-28T13:01:00.000Z"),
      ),
    ).toBeNull();
  });

  it("supports daily and monthly cadence without scheduling disabled exports", () => {
    const now = new Date("2026-07-15T14:00:00.000Z");
    expect(
      scheduledDataExportOccurrence({ ...schedule, cadence: "daily" }, now)
        ?.occurrenceKey,
    ).toBe("daily/2026-07-15");
    expect(
      scheduledDataExportOccurrence({ ...schedule, cadence: "monthly" }, now)
        ?.occurrenceKey,
    ).toBe("monthly/2026-07-15");
    expect(
      scheduledDataExportOccurrence({ ...schedule, enabled: false }, now),
    ).toBeNull();
  });

  it("uses bounded exponential backoff and stops at the retry limit", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    expect(dataExportRetryAt(now, 1)).toBe("2026-07-28T12:01:00.000Z");
    expect(dataExportRetryAt(now, 2)).toBe("2026-07-28T12:02:00.000Z");
    expect(dataExportRetryAt(now, 4)).toBe("2026-07-28T12:08:00.000Z");
    expect(dataExportRetryAt(now, 5)).toBeNull();
  });

  it("validates schedule bounds and IANA timezones", () => {
    expect(
      dataExportScheduleSchema.safeParse({
        enabled: true,
        exportFormat: "zip",
        cadence: "weekly",
        localTime: "06:30",
        weekday: 1,
        dayOfMonth: 15,
        timezone: "America/Los_Angeles",
      }).success,
    ).toBe(true);
    expect(
      dataExportScheduleSchema.safeParse({
        enabled: true,
        exportFormat: "zip",
        cadence: "monthly",
        localTime: "30:00",
        weekday: 8,
        dayOfMonth: 31,
        timezone: "Not/A_Timezone",
      }).success,
    ).toBe(false);
  });
});
