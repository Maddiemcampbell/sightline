import "server-only";

export type DashboardPerformanceMeasurement = Readonly<{
  operation: string;
  durationMs: number;
  outcome: "success" | "error";
}>;

/**
 * Collects privacy-safe dashboard timings. Operation names are defined by the
 * application; query parameters, returned records, and customer content are
 * intentionally never logged.
 */
export class DashboardPerformanceProfiler {
  private readonly startedAt = performance.now();
  private readonly measurements: DashboardPerformanceMeasurement[] = [];

  async measure<T>(
    operation: string,
    execute: () => PromiseLike<T>,
  ): Promise<T> {
    const startedAt = performance.now();
    try {
      const value = await execute();
      this.record(operation, startedAt, "success");
      return value;
    } catch (error) {
      this.record(operation, startedAt, "error");
      throw error;
    }
  }

  measureSync<T>(operation: string, execute: () => T): T {
    const startedAt = performance.now();
    try {
      const value = execute();
      this.record(operation, startedAt, "success");
      return value;
    } catch (error) {
      this.record(operation, startedAt, "error");
      throw error;
    }
  }

  report() {
    const report = {
      event: "dashboard.performance",
      totalDurationMs: roundDuration(performance.now() - this.startedAt),
      operations: this.measurements.toSorted((left, right) =>
        left.operation.localeCompare(right.operation),
      ),
    };
    console.info("[dashboard-performance]", report);
    return report;
  }

  snapshot() {
    return [...this.measurements];
  }

  private record(
    operation: string,
    startedAt: number,
    outcome: DashboardPerformanceMeasurement["outcome"],
  ) {
    this.measurements.push({
      operation,
      durationMs: roundDuration(performance.now() - startedAt),
      outcome,
    });
  }
}

function roundDuration(value: number) {
  return Math.round(value * 10) / 10;
}
