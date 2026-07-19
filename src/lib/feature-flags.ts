import { z } from "zod";

export const V2_FEATURE_FLAGS = [
  "recommendedActions",
  "aiEmailDrafting",
  "riskQuestions",
  "resolutionTracking",
  "notifications",
] as const;

export type V2FeatureFlag = (typeof V2_FEATURE_FLAGS)[number];
export type V2FeatureFlags = Readonly<Record<V2FeatureFlag, boolean>>;

const booleanEnvironmentValue = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const featureFlagEnvironmentSchema = z.object({
  V2_RECOMMENDED_ACTIONS_ENABLED: booleanEnvironmentValue,
  V2_AI_EMAIL_DRAFTING_ENABLED: booleanEnvironmentValue,
  V2_RISK_QUESTIONS_ENABLED: booleanEnvironmentValue,
  V2_RESOLUTION_TRACKING_ENABLED: booleanEnvironmentValue,
  V2_NOTIFICATIONS_ENABLED: booleanEnvironmentValue,
});

export function readV2FeatureFlags(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): V2FeatureFlags {
  const parsed = featureFlagEnvironmentSchema.parse(environment);
  return {
    recommendedActions: parsed.V2_RECOMMENDED_ACTIONS_ENABLED,
    aiEmailDrafting: parsed.V2_AI_EMAIL_DRAFTING_ENABLED,
    riskQuestions: parsed.V2_RISK_QUESTIONS_ENABLED,
    resolutionTracking: parsed.V2_RESOLUTION_TRACKING_ENABLED,
    notifications: parsed.V2_NOTIFICATIONS_ENABLED,
  };
}

export function isV2FeatureEnabled(
  flag: V2FeatureFlag,
  environment?: Readonly<Record<string, string | undefined>>,
): boolean {
  return readV2FeatureFlags(environment)[flag];
}
