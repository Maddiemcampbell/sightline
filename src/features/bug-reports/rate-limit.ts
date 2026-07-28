const submissions = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = 5;

export function allowBugReportSubmission(key: string, now = Date.now()) {
  const recent = (submissions.get(key) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  submissions.set(key, recent);
  return true;
}

export function resetBugReportRateLimit() {
  submissions.clear();
}
