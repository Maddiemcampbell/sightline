import { describe, expect, it } from "vitest";

import { buildExecutionHistory } from "./history";

const execution = (
  overrides: Partial<Parameters<typeof buildExecutionHistory>[0][number]> = {},
): Parameters<typeof buildExecutionHistory>[0][number] => ({
  id: "10000000-0000-4000-8000-000000000001",
  job_key: "daily-brief",
  status: "succeeded",
  trigger_type: "scheduled",
  attempt_number: 1,
  started_at: "2026-07-28T08:00:00.000Z",
  completed_at: "2026-07-28T08:00:05.000Z",
  duration_ms: 5_000,
  safe_error_summary: null,
  correlation_id: "20000000-0000-4000-8000-000000000001",
  created_at: "2026-07-28T08:00:00.000Z",
  ...overrides,
});

describe("scheduler execution history", () => {
  const names = new Map([["daily-brief", "Daily Brief generation"]]);

  it("preserves trigger, duration, status, and safe error history", () => {
    const history = buildExecutionHistory(
      [
        execution({
          status: "dead_lettered",
          trigger_type: "retry",
          attempt_number: 3,
          safe_error_summary: "Provider unavailable",
        }),
      ],
      names,
      {},
    );
    expect(history.rows[0]).toMatchObject({
      jobName: "Daily Brief generation",
      status: "dead_lettered",
      trigger: "retry",
      attemptNumber: 3,
      durationMs: 5_000,
      errorMessage: "Provider unavailable",
    });
    expect(history.retryCount).toBe(1);
    expect(history.deadLetterCount).toBe(1);
  });

  it("filters by status and trigger and searches errors", () => {
    const history = buildExecutionHistory(
      [
        execution(),
        execution({
          id: "10000000-0000-4000-8000-000000000002",
          status: "retrying",
          trigger_type: "retry",
          safe_error_summary: "Temporary database failure",
        }),
      ],
      names,
      {
        historyStatus: "retrying",
        historyTrigger: "retry",
        historyQ: "database",
      },
    );
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0]?.status).toBe("retrying");
  });

  it("sorts by duration and paginates execution records", () => {
    const rows = Array.from({ length: 30 }, (_, index) =>
      execution({
        id: `execution-${index}`,
        duration_ms: index * 1_000,
        created_at: `2026-07-28T08:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    const history = buildExecutionHistory(rows, names, {
      historySort: "duration",
      historyPage: 2,
    });
    expect(history.total).toBe(30);
    expect(history.pageCount).toBe(2);
    expect(history.rows).toHaveLength(5);
  });
});
