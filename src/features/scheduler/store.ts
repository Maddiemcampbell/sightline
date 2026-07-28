import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type {
  SchedulerStatus,
  SchedulerTrigger,
} from "@/features/scheduler/types";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type ExecutionRecord = {
  id: string;
  jobKey: string;
  correlationId: string;
  attemptNumber: number;
  rootExecutionId: string;
};

export type PersistedJobDefinition = {
  jobKey: string;
  cron: string;
  enabled: boolean;
};

export interface SchedulerStore {
  createExecution(input: {
    jobKey: string;
    trigger: SchedulerTrigger;
    scheduledFor: string | null;
    attemptNumber: number;
    parentExecutionId: string | null;
    rootExecutionId: string | null;
    initiatingOperatorId: string | null;
  }): Promise<ExecutionRecord>;
  acquireLock(input: {
    jobKey: string;
    executionId: string;
    token: string;
    now: string;
    expiresAt: string;
  }): Promise<boolean>;
  releaseLock(jobKey: string, token: string): Promise<void>;
  markRunning(id: string, startedAt: string): Promise<void>;
  finish(input: {
    id: string;
    status: SchedulerStatus;
    completedAt: string;
    durationMs: number;
    errorCode?: string | null;
    errorSummary?: string | null;
    nextRetryAt?: string | null;
    metadata?: Record<string, Json>;
  }): Promise<void>;
  definitions(): Promise<readonly PersistedJobDefinition[]>;
  scheduledExecutionExists(
    jobKey: string,
    scheduledFor: string,
  ): Promise<boolean>;
  markRetryDispatched(id: string): Promise<void>;
  dueRetries(now: string): Promise<
    readonly {
      id: string;
      jobKey: string;
      attemptNumber: number;
      rootExecutionId: string;
    }[]
  >;
}

export class SupabaseSchedulerStore implements SchedulerStore {
  constructor(
    private readonly client: SupabaseClient<AppDatabase> = createAdminSupabaseClient(),
  ) {}

  async createExecution(input: {
    jobKey: string;
    trigger: SchedulerTrigger;
    scheduledFor: string | null;
    attemptNumber: number;
    parentExecutionId: string | null;
    rootExecutionId: string | null;
    initiatingOperatorId: string | null;
  }): Promise<ExecutionRecord> {
    const result = await this.client
      .from("scheduler_job_executions")
      .insert({
        job_key: input.jobKey,
        trigger_type: input.trigger,
        scheduled_for: input.scheduledFor,
        attempt_number: input.attemptNumber,
        parent_execution_id: input.parentExecutionId,
        root_execution_id: input.rootExecutionId,
        initiating_operator_id: input.initiatingOperatorId,
      })
      .select("id,job_key,correlation_id,attempt_number,root_execution_id")
      .single();
    if (result.error) throw new Error(result.error.message);
    const rootExecutionId = result.data.root_execution_id ?? result.data.id;
    if (!result.data.root_execution_id) {
      const updated = await this.client
        .from("scheduler_job_executions")
        .update({ root_execution_id: rootExecutionId })
        .eq("id", result.data.id);
      if (updated.error) throw new Error(updated.error.message);
    }
    return {
      id: result.data.id,
      jobKey: result.data.job_key,
      correlationId: result.data.correlation_id,
      attemptNumber: result.data.attempt_number,
      rootExecutionId,
    };
  }

  async acquireLock(input: {
    jobKey: string;
    executionId: string;
    token: string;
    now: string;
    expiresAt: string;
  }) {
    const { data, error } = await this.client.rpc(
      "acquire_scheduler_job_lock",
      {
        requested_job_key: input.jobKey,
        requested_execution_id: input.executionId,
        requested_lease_token: input.token,
        requested_now: input.now,
        requested_lease_expires_at: input.expiresAt,
      },
    );
    if (error) throw new Error(error.message);
    return data;
  }

  async releaseLock(jobKey: string, token: string) {
    const { error } = await this.client.rpc("release_scheduler_job_lock", {
      requested_job_key: jobKey,
      requested_lease_token: token,
    });
    if (error) throw new Error(error.message);
  }

  async markRunning(id: string, startedAt: string) {
    const { error } = await this.client
      .from("scheduler_job_executions")
      .update({ status: "running", started_at: startedAt })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async finish(input: {
    id: string;
    status: SchedulerStatus;
    completedAt: string;
    durationMs: number;
    errorCode?: string | null;
    errorSummary?: string | null;
    nextRetryAt?: string | null;
    metadata?: Record<string, Json>;
  }) {
    const { error } = await this.client
      .from("scheduler_job_executions")
      .update({
        status: input.status,
        completed_at: input.completedAt,
        duration_ms: input.durationMs,
        safe_error_code: input.errorCode ?? null,
        safe_error_summary: input.errorSummary ?? null,
        next_retry_at: input.nextRetryAt ?? null,
        safe_metadata: input.metadata ?? {},
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  }

  async definitions() {
    const { data, error } = await this.client
      .from("scheduler_job_definitions")
      .select("job_key,cron_schedule,enabled");
    if (error) throw new Error(error.message);
    return (data ?? []).map((definition) => ({
      jobKey: definition.job_key,
      cron: definition.cron_schedule,
      enabled: definition.enabled,
    }));
  }

  async scheduledExecutionExists(jobKey: string, scheduledFor: string) {
    const { count, error } = await this.client
      .from("scheduler_job_executions")
      .select("id", { count: "exact", head: true })
      .eq("job_key", jobKey)
      .eq("trigger_type", "scheduled")
      .eq("scheduled_for", scheduledFor);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async markRetryDispatched(id: string) {
    const { error } = await this.client
      .from("scheduler_job_executions")
      .update({ next_retry_at: null })
      .eq("id", id)
      .in("status", ["retrying", "timed_out"]);
    if (error) throw new Error(error.message);
  }

  async dueRetries(now: string) {
    const { data, error } = await this.client
      .from("scheduler_job_executions")
      .select("id,job_key,attempt_number,root_execution_id")
      .in("status", ["retrying", "timed_out"])
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", now)
      .order("next_retry_at")
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((execution) => ({
      id: execution.id,
      jobKey: execution.job_key,
      attemptNumber: execution.attempt_number,
      rootExecutionId: execution.root_execution_id ?? execution.id,
    }));
  }
}
