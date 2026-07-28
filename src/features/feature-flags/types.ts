export type FeatureFlag = Readonly<{
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultEnabled: boolean;
  environments: readonly string[];
  organizationIds: readonly string[];
  userIds: readonly string[];
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
}>;

export type FlagEvaluationContext = Readonly<{
  environment: string;
  organizationId?: string | null;
  userId?: string | null;
  fallback?: boolean;
}>;

export type FlagEvaluation = Readonly<{
  enabled: boolean;
  reason:
    | "unknown_flag"
    | "disabled"
    | "environment_mismatch"
    | "organization_target"
    | "user_target"
    | "percentage_rollout"
    | "default_fallback";
  bucket?: number;
}>;
