export const EXCEPTION_RULE_TYPES = [
  "margin_below_target",
  "budget_variance",
  "unowned_high_risk",
  "action_due",
  "document_expiring",
  "sync_stale",
  "forecast_inputs_stale",
] as const;

export type ExceptionRuleType = (typeof EXCEPTION_RULE_TYPES)[number];

export type DetectedException = Readonly<{
  ruleType: ExceptionRuleType;
  fingerprint: string;
  subjectType: string;
  subjectId: string;
  severity: "warning" | "critical";
  title: string;
  body: string;
  href: string;
  payload?: Record<string, string | number | boolean | null>;
}>;

export type ExceptionRuleSettings = Readonly<{
  marginEnabled: boolean;
  marginFloorPercent: number;
  budgetEnabled: boolean;
  budgetVariancePercent: number;
  unownedRiskEnabled: boolean;
  actionDueEnabled: boolean;
  actionDueDays: number;
  documentExpiryEnabled: boolean;
  documentExpiryDays: number;
  syncStaleEnabled: boolean;
  syncStaleHours: number;
  forecastStaleEnabled: boolean;
  forecastStaleDays: number;
}>;
