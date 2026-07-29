import { describe, expect, it, vi } from "vitest";

import { DashboardPerformanceProfiler } from "@/features/dashboard/performance";

describe("DashboardPerformanceProfiler", () => {
  it("profiles asynchronous and derived stages without recording customer data", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const profiler = new DashboardPerformanceProfiler();

    await profiler.measure("query.projects", async () => ({
      secret: "must-not-be-logged",
    }));
    profiler.measureSync("derive.summary", () => "customer content");
    const report = profiler.report();

    expect(report.operations).toEqual([
      expect.objectContaining({
        operation: "derive.summary",
        outcome: "success",
      }),
      expect.objectContaining({
        operation: "query.projects",
        outcome: "success",
      }),
    ]);
    expect(JSON.stringify(report)).not.toContain("must-not-be-logged");
    expect(JSON.stringify(report)).not.toContain("customer content");
    log.mockRestore();
  });

  it("records failed operations before propagating the error", async () => {
    const profiler = new DashboardPerformanceProfiler();

    await expect(
      profiler.measure("query.risks", async () => {
        throw new Error("query failed");
      }),
    ).rejects.toThrow("query failed");
    expect(profiler.snapshot()).toEqual([
      expect.objectContaining({
        operation: "query.risks",
        outcome: "error",
      }),
    ]);
  });
});
