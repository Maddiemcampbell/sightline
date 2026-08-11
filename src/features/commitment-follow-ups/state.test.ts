import { describe, expect, it } from "vitest";
import {
  commitmentTiming,
  shouldRemind,
} from "@/features/commitment-follow-ups/state";

const base = {
  status: "awaiting_response" as const,
  expected_response_at: "2026-08-10T17:00:00.000Z",
  last_reminded_at: null,
};

describe("commitment follow-up state", () => {
  it("distinguishes upcoming, due, overdue, received, and resolved commitments", () => {
    expect(commitmentTiming(base, new Date("2026-08-09T20:00:00Z"))).toBe(
      "upcoming",
    );
    expect(commitmentTiming(base, new Date("2026-08-10T20:00:00Z"))).toBe(
      "due_today",
    );
    expect(commitmentTiming(base, new Date("2026-08-11T20:00:00Z"))).toBe(
      "overdue",
    );
    expect(
      commitmentTiming({ ...base, status: "response_received" }, new Date()),
    ).toBe("received");
    expect(commitmentTiming({ ...base, status: "resolved" }, new Date())).toBe(
      "resolved",
    );
  });

  it("reminds at most once every 24 hours while overdue", () => {
    const now = new Date("2026-08-12T20:00:00Z");
    expect(shouldRemind(base, now)).toBe(true);
    expect(
      shouldRemind({ ...base, last_reminded_at: "2026-08-12T10:00:00Z" }, now),
    ).toBe(false);
    expect(
      shouldRemind({ ...base, last_reminded_at: "2026-08-11T10:00:00Z" }, now),
    ).toBe(true);
  });
});
