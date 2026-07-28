import { isValidCron } from "./cron";
import type { RegisteredJob } from "./types";

export class SchedulerRegistry {
  readonly #jobs = new Map<string, RegisteredJob>();

  constructor(jobs: readonly RegisteredJob[]) {
    for (const job of jobs) this.register(job);
  }

  register(job: RegisteredJob): void {
    if (!job.handler || typeof job.handler !== "function")
      throw new Error(`Scheduler job "${job.key}" has no handler.`);
    if (!isValidCron(job.cron))
      throw new Error(
        `Scheduler job "${job.key}" has an invalid cron schedule.`,
      );
    if (this.#jobs.has(job.key))
      throw new Error(`Duplicate scheduler job key "${job.key}".`);
    if (job.timeoutMs < 1_000 || job.retry.maximumRetries < 0)
      throw new Error(`Scheduler job "${job.key}" has invalid configuration.`);
    this.#jobs.set(job.key, job);
  }

  get(key: string): RegisteredJob {
    const job = this.#jobs.get(key);
    if (!job) throw new Error(`Unknown scheduler job "${key}".`);
    return job;
  }

  all(): readonly RegisteredJob[] {
    return [...this.#jobs.values()];
  }
}
