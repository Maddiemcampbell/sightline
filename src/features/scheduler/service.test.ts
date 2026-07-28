import { describe, expect, it, vi } from "vitest";

import { SchedulerRegistry } from "./registry";
import { SchedulerService } from "./service";
import type {
  ExecutionRecord,
  PersistedJobDefinition,
  SchedulerStore,
} from "./store";
import {
  NonRetryableSchedulerError,
  type RegisteredJob,
  type SchedulerStatus,
} from "./types";

type Finish = {
  id: string;
  status: SchedulerStatus;
  nextRetryAt?: string | null;
  errorCode?: string | null;
};

class FakeStore implements SchedulerStore {
  readonly executions: ExecutionRecord[] = [];
  readonly finishes: Finish[] = [];
  readonly locks = new Map<string, { token: string; expiresAt: string }>();
  definitionsValue: PersistedJobDefinition[] = [];
  retries: Awaited<ReturnType<SchedulerStore["dueRetries"]>> = [];
  dispatched: string[] = [];

  async createExecution(input: {
    jobKey: string;
    attemptNumber: number;
    rootExecutionId: string | null;
  }) {
    const id = crypto.randomUUID();
    const execution = {
      id,
      jobKey: input.jobKey,
      correlationId: crypto.randomUUID(),
      attemptNumber: input.attemptNumber,
      rootExecutionId: input.rootExecutionId ?? id,
    };
    this.executions.push(execution);
    return execution;
  }
  async acquireLock(input: {
    jobKey: string;
    token: string;
    now: string;
    expiresAt: string;
  }) {
    const lock = this.locks.get(input.jobKey);
    if (lock && lock.expiresAt > input.now) return false;
    this.locks.set(input.jobKey, {
      token: input.token,
      expiresAt: input.expiresAt,
    });
    return true;
  }
  async releaseLock(jobKey: string, token: string) {
    if (this.locks.get(jobKey)?.token === token) this.locks.delete(jobKey);
  }
  async markRunning() {}
  async finish(input: {
    id: string;
    status: SchedulerStatus;
    nextRetryAt?: string | null;
    errorCode?: string | null;
  }) {
    this.finishes.push(input);
  }
  async definitions() {
    return this.definitionsValue;
  }
  async scheduledExecutionExists() {
    return false;
  }
  async markRetryDispatched(id: string) {
    this.dispatched.push(id);
  }
  async dueRetries() {
    return this.retries;
  }
}

function job(
  handler: RegisteredJob["handler"],
  overrides: Partial<RegisteredJob> = {},
): RegisteredJob {
  return {
    key: "test-job",
    name: "Test",
    description: "Test",
    cron: "0 7 * * *",
    enabled: true,
    timeoutMs: 1_000,
    retry: { maximumRetries: 1, backoffMs: 5_000 },
    concurrency: "forbid",
    handler,
    ...overrides,
  };
}

function service(registeredJob: RegisteredJob, store: FakeStore) {
  return new SchedulerService(
    new SchedulerRegistry([registeredJob]),
    store,
    () => new Date("2026-07-27T07:00:00.000Z"),
    vi.fn().mockResolvedValue(undefined),
  );
}

describe("SchedulerService execution lifecycle", () => {
  it("records successful execution and releases its lock", async () => {
    const store = new FakeStore();
    const result = await service(
      job(async () => ({ count: 1 })),
      store,
    ).trigger({
      jobKey: "test-job",
      trigger: "scheduled",
    });
    expect(result.status).toBe("succeeded");
    expect(store.finishes.at(-1)?.status).toBe("succeeded");
    expect(store.locks.size).toBe(0);
  });

  it("prevents overlaps across scheduler instances sharing the store", async () => {
    const store = new FakeStore();
    let release: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const registeredJob = job(async () => {
      await waiting;
      return {};
    });
    const first = service(registeredJob, store).trigger({
      jobKey: "test-job",
      trigger: "manual",
    });
    await vi.waitFor(() => expect(store.locks.size).toBe(1));
    const second = await service(registeredJob, store).trigger({
      jobKey: "test-job",
      trigger: "manual",
    });
    expect(second.status).toBe("skipped");
    release?.();
    await first;
    expect(store.locks.size).toBe(0);
  });

  it("recovers an expired lock safely", async () => {
    const store = new FakeStore();
    store.locks.set("test-job", {
      token: crypto.randomUUID(),
      expiresAt: "2026-07-27T06:59:00.000Z",
    });
    const result = await service(
      job(async () => ({})),
      store,
    ).trigger({
      jobKey: "test-job",
      trigger: "scheduled",
    });
    expect(result.status).toBe("succeeded");
  });

  it("records retryable and non-retryable failures correctly", async () => {
    const retryStore = new FakeStore();
    await service(
      job(async () => {
        throw new Error("temporary");
      }),
      retryStore,
    ).trigger({ jobKey: "test-job", trigger: "scheduled" });
    expect(retryStore.finishes.at(-1)?.status).toBe("retrying");
    expect(retryStore.finishes.at(-1)?.nextRetryAt).toBe(
      "2026-07-27T07:00:05.000Z",
    );
    expect(retryStore.locks.size).toBe(0);

    const permanentStore = new FakeStore();
    await service(
      job(async () => {
        throw new NonRetryableSchedulerError("invalid_input", "Invalid input");
      }),
      permanentStore,
    ).trigger({ jobKey: "test-job", trigger: "scheduled" });
    expect(permanentStore.finishes.at(-1)).toMatchObject({
      status: "failed",
      errorCode: "invalid_input",
    });
  });

  it("records timed-out runs and releases the lock", async () => {
    vi.useFakeTimers();
    try {
      const store = new FakeStore();
      const pending = service(
        job(() => new Promise(() => undefined)),
        store,
      ).trigger({ jobKey: "test-job", trigger: "scheduled" });
      await vi.advanceTimersByTimeAsync(1_000);
      const result = await pending;
      expect(result.status).toBe("timed_out");
      expect(store.finishes.at(-1)).toMatchObject({
        status: "timed_out",
        errorCode: "execution_timeout",
      });
      expect(store.locks.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("enforces retry limits and links persisted retries", async () => {
    const store = new FakeStore();
    store.definitionsValue = [
      { jobKey: "test-job", cron: "0 7 * * *", enabled: false },
    ];
    store.retries = [
      {
        id: "parent",
        jobKey: "test-job",
        attemptNumber: 1,
        rootExecutionId: "root",
      },
    ];
    await service(
      job(async () => {
        throw new Error("still failing");
      }),
      store,
    ).runDue();
    expect(store.dispatched).toEqual(["parent"]);
    expect(store.executions.at(-1)).toMatchObject({
      attemptNumber: 2,
      rootExecutionId: "root",
    });
    expect(store.finishes.at(-1)?.status).toBe("failed");
  });

  it("triggers due enabled jobs but not disabled or early jobs", async () => {
    const dueStore = new FakeStore();
    dueStore.definitionsValue = [
      { jobKey: "test-job", cron: "0 7 * * *", enabled: true },
    ];
    await service(
      job(async () => ({})),
      dueStore,
    ).runDue();
    expect(dueStore.executions).toHaveLength(1);

    const disabledStore = new FakeStore();
    disabledStore.definitionsValue = [
      { jobKey: "test-job", cron: "0 7 * * *", enabled: false },
    ];
    await service(
      job(async () => ({})),
      disabledStore,
    ).runDue();
    expect(disabledStore.executions).toHaveLength(0);

    const earlyStore = new FakeStore();
    earlyStore.definitionsValue = [
      { jobKey: "test-job", cron: "0 8 * * *", enabled: true },
    ];
    await service(
      job(async () => ({})),
      earlyStore,
    ).runDue();
    expect(earlyStore.executions).toHaveLength(0);
  });
});
