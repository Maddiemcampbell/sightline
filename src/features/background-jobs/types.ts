import type { Json } from "@/lib/supabase/database.types";

export type OrganizationJobType =
  "portfolio_refresh" | "daily_executive_brief" | "procore_sync";
export type OrganizationJobSource = "scheduled" | "manual" | "retry";
export type OrganizationJobMetrics = Readonly<Record<string, Json>>;

export type ExecuteOrganizationJobInput = Readonly<{
  organizationId: string;
  jobType: OrganizationJobType;
  source: OrganizationJobSource;
  idempotencyKey: string;
  maxAttempts?: number;
  requestedByMembershipId?: string | null;
  scheduledFor?: string | null;
}>;

export type OrganizationJobOutcome = Readonly<{
  id: string;
  organizationId: string;
  status: "succeeded" | "failed" | "skipped";
  attemptCount: number;
  metrics: OrganizationJobMetrics;
}>;
