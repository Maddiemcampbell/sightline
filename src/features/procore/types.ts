export type ProcoreEnvironment = "sandbox" | "production";

export type ProcoreConnectionStatus =
  | "pending"
  | "active"
  | "degraded"
  | "permission_error"
  | "authentication_error"
  | "sync_error"
  | "disconnected";

export type ProcoreResourceType =
  | "companies"
  | "projects"
  | "budgets"
  | "budget_rows"
  | "commitments"
  | "direct_costs"
  | "changes"
  | "change_events"
  | "rfis"
  | "submittals"
  | "documents";

export type ProcoreProject = {
  id: number | string;
  name: string;
  project_number?: string | null;
  display_name?: string | null;
  active?: boolean | null;
  status?: string | null;
  updated_at?: string | null;
};

export type ProcorePage<T> = {
  data: T[];
  page?: number;
  per_page?: number;
  total?: number;
};

export type ProcoreNormalizedErrorCode =
  | "authentication"
  | "permission"
  | "rate_limit"
  | "transient"
  | "invalid_response"
  | "request";

export class ProcoreApiError extends Error {
  constructor(
    message: string,
    readonly code: ProcoreNormalizedErrorCode,
    readonly status: number | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "ProcoreApiError";
  }
}
