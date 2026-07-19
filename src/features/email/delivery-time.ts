export function localDeliveryState(
  now: Date,
  timezone: string,
): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

export function isBriefDeliveryDue(input: {
  now: Date;
  timezone: string;
  preferredTime: string;
  briefDate: string;
}): boolean {
  const state = localDeliveryState(input.now, input.timezone);
  const [hours, minutes] = input.preferredTime.split(":").map(Number);
  return (
    state.date === input.briefDate &&
    state.minutes >= (hours ?? 0) * 60 + (minutes ?? 0)
  );
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function scheduledDeliveryKey(briefId: string, userId: string): string {
  return `morning-brief/${briefId}/${userId}`;
}
