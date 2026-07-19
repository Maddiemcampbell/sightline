import { describe, expect, it } from "vitest";

import {
  formatBriefDate,
  formatMoney,
  formatRelativeSync,
} from "@/features/daily-brief/formatters";

describe("Daily Brief formatters", () => {
  it("formats integer cents as executive-readable currency", () => {
    expect(formatMoney(12500000)).toBe("$125,000");
  });

  it("formats the seeded brief date with a weekday", () => {
    expect(formatBriefDate("2026-07-18")).toBe("Saturday, July 18");
  });

  it("handles a source that has never synced", () => {
    expect(formatRelativeSync(null)).toBe("Not synced yet");
  });
});
