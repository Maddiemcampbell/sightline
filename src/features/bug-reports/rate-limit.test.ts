import { beforeEach, describe, expect, it } from "vitest";

import {
  allowBugReportSubmission,
  resetBugReportRateLimit,
} from "./rate-limit";

describe("bug report rate limiting", () => {
  beforeEach(resetBugReportRateLimit);

  it("limits bursts and recovers after the window", () => {
    for (let count = 0; count < 5; count += 1)
      expect(allowBugReportSubmission("org:user", count)).toBe(true);
    expect(allowBugReportSubmission("org:user", 5)).toBe(false);
    expect(allowBugReportSubmission("org:user", 60_001)).toBe(true);
  });
});
