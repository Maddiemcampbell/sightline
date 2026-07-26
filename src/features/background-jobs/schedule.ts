import type { OrganizationJobType } from "@/features/background-jobs/types";

function localParts(now: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function scheduledOrganizationJob(
  input: Readonly<{
    organizationId: string;
    jobType: OrganizationJobType;
    enabled: boolean;
    localTime: string;
    timezone: string;
    now: Date;
  }>,
) {
  if (!input.enabled) return null;
  const local = localParts(input.now, input.timezone);
  const [hours = 0, minutes = 0] = input.localTime
    .slice(0, 5)
    .split(":")
    .map(Number);
  if (local.minutes < hours * 60 + minutes) return null;
  return {
    idempotencyKey: `scheduled/${local.date}`,
    localDate: local.date,
    scheduledFor: input.now.toISOString(),
  };
}

export function organizationJobRetryAt(
  now: Date,
  attemptCount: number,
  maxAttempts: number,
) {
  return attemptCount < maxAttempts
    ? new Date(now.getTime() + attemptCount * 15 * 60_000).toISOString()
    : null;
}
