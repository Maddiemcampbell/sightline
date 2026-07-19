import type { TimelineItem } from "@/features/activity/types";

export function orderTimelineItems(
  items: readonly TimelineItem[],
): TimelineItem[] {
  return [...items].sort((left, right) => {
    const time = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    return time || right.id.localeCompare(left.id);
  });
}
