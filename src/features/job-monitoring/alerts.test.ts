import { describe, expect, it } from "vitest";
import {
  consecutiveFailures,
  expectedDurationMs,
} from "@/features/job-monitoring/alerts";

describe("centralized job health calculations", () => {
  it("counts only failures since the last recovery", () => {
    expect(
      consecutiveFailures(["failed", "failed", "succeeded", "failed"]),
    ).toBe(2);
    expect(consecutiveFailures(["succeeded", "failed"])).toBe(0);
    expect(consecutiveFailures([])).toBe(0);
  });

  it("uses explicit expected execution thresholds", () => {
    expect(expectedDurationMs("portfolio_refresh")).toBe(15 * 60_000);
    expect(expectedDurationMs("daily_executive_brief")).toBe(10 * 60_000);
  });
});
