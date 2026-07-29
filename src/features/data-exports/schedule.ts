import { localScheduleParts } from "@/features/background-jobs/schedule";

export type DataExportScheduleConfiguration = Readonly<{
  id: string;
  organizationId: string;
  enabled: boolean;
  cadence: "daily" | "weekly" | "monthly";
  localTime: string;
  weekday: number;
  dayOfMonth: number;
  timezone: string;
}>;

export function scheduledDataExportOccurrence(
  schedule: DataExportScheduleConfiguration,
  now: Date,
) {
  if (!schedule.enabled) return null;
  const local = localScheduleParts(now, schedule.timezone);
  const [hour = 0, minute = 0] = schedule.localTime
    .slice(0, 5)
    .split(":")
    .map(Number);
  if (local.minutes < hour * 60 + minute) return null;
  if (schedule.cadence === "weekly" && local.weekday !== schedule.weekday)
    return null;
  if (
    schedule.cadence === "monthly" &&
    local.dayOfMonth !== schedule.dayOfMonth
  )
    return null;
  return {
    occurrenceKey: `${schedule.cadence}/${local.date}`,
    localDate: local.date,
  };
}

export function dataExportRetryAt(
  now: Date,
  attemptCount: number,
  maximumAttempts = 5,
) {
  if (attemptCount >= maximumAttempts) return null;
  const delayMs = Math.min(
    30 * 60_000,
    60_000 * 2 ** Math.max(0, attemptCount - 1),
  );
  return new Date(now.getTime() + delayMs).toISOString();
}
