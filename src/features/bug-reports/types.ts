export const BUG_SEVERITIES = [
  "blocking",
  "major",
  "minor",
  "cosmetic",
] as const;
export const BUG_STATUSES = [
  "new",
  "triaged",
  "in_progress",
  "resolved",
  "closed",
  "duplicate",
  "cannot_reproduce",
] as const;

export type BugSeverity = (typeof BUG_SEVERITIES)[number];
export type BugStatus = (typeof BUG_STATUSES)[number];

export type BugReportInput = {
  title: string;
  description: string;
  stepsToReproduce?: string | undefined;
  expectedBehavior?: string | undefined;
  actualBehavior?: string | undefined;
  severity?: BugSeverity | undefined;
  relevantRoute?: string | undefined;
  relevantFeature?: string | undefined;
  diagnosticConsent: boolean;
  viewportWidth?: number | undefined;
  viewportHeight?: number | undefined;
  browserOs?: string | undefined;
  clientErrorReference?: string | undefined;
  idempotencyKey: string;
  correlationId: string;
};
