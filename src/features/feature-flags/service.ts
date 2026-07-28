import "server-only";

import { headers } from "next/headers";
import { evaluateFeatureFlag } from "./evaluate";
import { FeatureFlagRepository } from "./repository";
import type { FlagEvaluationContext } from "./types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function isFeatureEnabled(
  key: string,
  context: Omit<FlagEvaluationContext, "environment"> & {
    environment?: string;
    debug?: boolean;
  } = {},
): Promise<boolean> {
  const repository = new FeatureFlagRepository(createAdminSupabaseClient());
  const environment =
    context.environment ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development";
  const flag = await repository.findByKey(key);
  const evaluation = evaluateFeatureFlag(flag, {
    environment,
    organizationId: context.organizationId ?? null,
    userId: context.userId ?? null,
    fallback: context.fallback ?? false,
  });
  if (!flag || context.debug) {
    const requestHeaders = await headers();
    void repository
      .logEvaluation({
        flag,
        key,
        environment,
        organizationId: context.organizationId ?? null,
        userId: context.userId ?? null,
        result: evaluation.enabled,
        reason: evaluation.reason,
        correlationId:
          requestHeaders.get("x-correlation-id") ??
          requestHeaders.get("x-request-id"),
      })
      .catch(() => undefined);
  }
  return evaluation.enabled;
}
