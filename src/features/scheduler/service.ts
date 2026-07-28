import "server-only";

import { cronMatches, isValidCron } from "./cron";
import { schedulerRegistry } from "./jobs";
import { SchedulerRegistry } from "./registry";
import { SupabaseSchedulerStore, type SchedulerStore } from "./store";
import {
  NonRetryableSchedulerError,
  type SchedulerStatus,
  type TriggerJobInput,
} from "./types";
import {
  sanitizeMetadata,
  sanitizeText,
} from "@/features/observability/sanitize";
import { reportError } from "@/features/observability/service";
import type { Json } from "@/lib/supabase/database.types";

class SchedulerTimeoutError extends Error {
  constructor() {
    super("The job exceeded its configured execution timeout.");
    this.name = "SchedulerTimeoutError";
  }
}

export class SchedulerService {
  constructor(
    private readonly registry: SchedulerRegistry = schedulerRegistry,
    private readonly store: SchedulerStore = new SupabaseSchedulerStore(),
    private readonly clock: () => Date = () => new Date(),
    private readonly errorReporter: typeof reportError = reportError,
  ) {}

  async trigger(input: TriggerJobInput) {
    const job = this.registry.get(input.jobKey);
    const attemptNumber = input.attemptNumber ?? 1;
    const execution = await this.store.createExecution({
      jobKey: job.key,
      trigger: input.trigger,
      scheduledFor: input.scheduledFor ?? null,
      attemptNumber,
      parentExecutionId: input.parentExecutionId ?? null,
      rootExecutionId: input.rootExecutionId ?? null,
      initiatingOperatorId: input.initiatingOperatorId ?? null,
    });
    const lockToken = crypto.randomUUID();
    const lockAt = this.clock();
    const acquired = await this.store.acquireLock({
      jobKey: job.key,
      executionId: execution.id,
      token: lockToken,
      now: lockAt.toISOString(),
      expiresAt: new Date(
        lockAt.getTime() + job.timeoutMs + 60_000,
      ).toISOString(),
    });
    if (!acquired) {
      await this.store.finish({
        id: execution.id,
        status: "skipped",
        completedAt: this.clock().toISOString(),
        durationMs: 0,
        errorCode: "overlapping_execution",
        errorSummary: "Skipped because this job is already running.",
      });
      return { ...execution, status: "skipped" as const };
    }

    const startedAt = this.clock();
    await this.store.markRunning(execution.id, startedAt.toISOString());
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const metadata = await Promise.race([
        job.handler({
          executionId: execution.id,
          correlationId: execution.correlationId,
          signal: controller.signal,
          scheduledFor: input.scheduledFor ?? null,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new SchedulerTimeoutError());
          }, job.timeoutMs);
        }),
      ]);
      const completedAt = this.clock();
      await this.store.finish({
        id: execution.id,
        status: "succeeded",
        completedAt: completedAt.toISOString(),
        durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
        metadata: sanitizeMetadata(metadata) as Record<string, Json>,
      });
      safeLog("completed", execution.correlationId, {
        jobKey: job.key,
        executionId: execution.id,
      });
      return { ...execution, status: "succeeded" as const };
    } catch (caught) {
      const completedAt = this.clock();
      const timeout = caught instanceof SchedulerTimeoutError;
      const retryable = !(caught instanceof NonRetryableSchedulerError);
      const hasRetry = retryable && attemptNumber <= job.retry.maximumRetries;
      const retriesExhausted =
        retryable && attemptNumber > job.retry.maximumRetries;
      const status: SchedulerStatus = hasRetry
        ? timeout
          ? "timed_out"
          : "retrying"
        : retriesExhausted
          ? "dead_lettered"
          : "failed";
      const nextRetryAt = hasRetry
        ? new Date(
            completedAt.getTime() + retryBackoffMs(job.retry, attemptNumber),
          ).toISOString()
        : null;
      const error =
        caught instanceof Error ? caught : new Error("Unknown scheduler error");
      await this.store.finish({
        id: execution.id,
        status,
        completedAt: completedAt.toISOString(),
        durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
        errorCode:
          caught instanceof NonRetryableSchedulerError
            ? caught.code.slice(0, 120)
            : timeout
              ? "execution_timeout"
              : "execution_failed",
        errorSummary: sanitizeText(error.message, 500),
        nextRetryAt,
      });
      await this.errorReporter({
        error,
        source: "background_job",
        metadata: {
          jobKey: job.key,
          executionId: execution.id,
          correlationId: execution.correlationId,
          status,
        },
      });
      safeLog(
        hasRetry
          ? "retry_scheduled"
          : status === "dead_lettered"
            ? "dead_lettered"
            : "failed",
        execution.correlationId,
        {
          jobKey: job.key,
          executionId: execution.id,
          status,
          attemptNumber,
          nextRetryAt,
        },
      );
      return { ...execution, status };
    } finally {
      if (timer) clearTimeout(timer);
      await this.store.releaseLock(job.key, lockToken);
    }
  }

  async runDue(now = this.clock()) {
    const definitions = await this.store.definitions();
    const persisted = new Map(definitions.map((job) => [job.jobKey, job]));
    for (const job of this.registry.all()) {
      const definition = persisted.get(job.key);
      if (!definition)
        throw new Error(
          `Registered scheduler job "${job.key}" is not persisted.`,
        );
      if (!isValidCron(definition.cron))
        throw new Error(
          `Persisted scheduler job "${job.key}" has invalid cron.`,
        );
    }
    const results = [];
    const scheduledFor = new Date(now);
    scheduledFor.setUTCSeconds(0, 0);
    for (const job of this.registry.all()) {
      const definition = persisted.get(job.key)!;
      if (
        !job.enabled ||
        !definition.enabled ||
        !cronMatches(definition.cron, scheduledFor)
      )
        continue;
      if (
        await this.store.scheduledExecutionExists(
          job.key,
          scheduledFor.toISOString(),
        )
      )
        continue;
      results.push(
        await this.trigger({
          jobKey: job.key,
          trigger: "scheduled",
          scheduledFor: scheduledFor.toISOString(),
        }),
      );
    }
    for (const retry of await this.store.dueRetries(now.toISOString())) {
      await this.store.markRetryDispatched(retry.id);
      results.push(
        await this.trigger({
          jobKey: retry.jobKey,
          trigger: "retry",
          attemptNumber: retry.attemptNumber + 1,
          parentExecutionId: retry.id,
          rootExecutionId: retry.rootExecutionId,
        }),
      );
    }
    return results;
  }
}

export function retryBackoffMs(
  policy: Readonly<{
    backoffMs: number;
    maximumBackoffMs: number;
  }>,
  failedAttemptNumber: number,
) {
  return Math.min(
    policy.maximumBackoffMs,
    policy.backoffMs * Math.pow(2, Math.max(0, failedAttemptNumber - 1)),
  );
}

function safeLog(
  event: string,
  correlationId: string,
  metadata: Record<string, unknown>,
) {
  console.info("[scheduler]", {
    event,
    correlationId,
    ...sanitizeMetadata(metadata),
  });
}
