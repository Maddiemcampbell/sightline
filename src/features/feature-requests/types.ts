export const FEATURE_REQUEST_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;
export const FEATURE_REQUEST_STATUSES = [
  "new",
  "under_review",
  "planned",
  "in_progress",
  "released",
  "declined",
  "duplicate",
] as const;

export type FeatureRequestPriority =
  (typeof FEATURE_REQUEST_PRIORITIES)[number];
export type FeatureRequestStatus = (typeof FEATURE_REQUEST_STATUSES)[number];

export type FeatureRequestInput = {
  title: string;
  description: string;
  useCase?: string | undefined;
  desiredOutcome?: string | undefined;
  relevantRoute?: string | undefined;
  relevantFeature?: string | undefined;
  priority?: FeatureRequestPriority | undefined;
  diagnosticConsent: boolean;
  viewportWidth?: number | undefined;
  viewportHeight?: number | undefined;
  browserOs?: string | undefined;
  idempotencyKey: string;
  correlationId: string;
};
