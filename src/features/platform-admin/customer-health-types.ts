export type CustomerHealthStatus = "healthy" | "watch" | "needs_attention";

export type CustomerHealthSummary = Readonly<{
  id: string;
  name: string;
  slug: string;
  accountStatus: "active" | "pending_deletion" | "archived";
  createdAt: string;
  healthStatus: CustomerHealthStatus;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  jobFailures30d: number;
  lastJobFailureAt: string | null;
  activityEvents30d: number;
  onboardingCompletionPercent: number;
  adoptedFeatureCount: number;
  availableFeatureCount: number;
  featureAdoptionPercent: number;
}>;

export type CustomerHealthListInput = Readonly<{
  query: string;
  status: "all" | CustomerHealthStatus;
  sort: "health" | "login" | "activity" | "onboarding" | "adoption" | "jobs";
  page: number;
  pageSize: 10 | 25 | 50 | 100;
}>;

export type CustomerHealthPage = Readonly<{
  items: readonly CustomerHealthSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}>;

export type CustomerHealthCounts = Readonly<{
  total: number;
  healthy: number;
  watch: number;
  needsAttention: number;
}>;
