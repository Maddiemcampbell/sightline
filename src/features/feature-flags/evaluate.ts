import type {
  FeatureFlag,
  FlagEvaluation,
  FlagEvaluationContext,
} from "./types";

export function evaluateFeatureFlag(
  flag: FeatureFlag | null,
  context: FlagEvaluationContext,
): FlagEvaluation {
  const fallback = context.fallback ?? flag?.defaultEnabled ?? false;
  if (!flag) return { enabled: fallback, reason: "unknown_flag" };
  if (!flag.enabled) return { enabled: false, reason: "disabled" };
  if (
    flag.environments.length > 0 &&
    !flag.environments.includes(context.environment)
  )
    return { enabled: fallback, reason: "environment_mismatch" };
  if (
    context.organizationId &&
    flag.organizationIds.includes(context.organizationId)
  )
    return { enabled: true, reason: "organization_target" };
  if (context.userId && flag.userIds.includes(context.userId))
    return { enabled: true, reason: "user_target" };
  if (flag.rolloutPercentage === 100)
    return { enabled: true, reason: "percentage_rollout", bucket: 0 };
  const subject = context.organizationId ?? context.userId;
  if (subject && flag.rolloutPercentage > 0) {
    const bucket = stableRolloutBucket(`${flag.key}:${subject}`);
    if (bucket < flag.rolloutPercentage)
      return { enabled: true, reason: "percentage_rollout", bucket };
  }
  return { enabled: fallback, reason: "default_fallback" };
}

export function stableRolloutBucket(subject: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < subject.length; index += 1) {
    hash ^= subject.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 100;
}
