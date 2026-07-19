import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  ACTOR_TYPES,
  RISK_ACTIVITY_TYPES,
  RISK_STATUSES,
} from "@/domain/types";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { Json } from "@/lib/supabase/database.types";

export const riskActivityInputSchema = z
  .object({
    riskId: z.uuid(),
    activityType: z.enum(RISK_ACTIVITY_TYPES),
    actorType: z.enum(ACTOR_TYPES).default("user"),
    summary: z.string().trim().min(1).max(3_000),
    fromStatus: z.enum(RISK_STATUSES).nullable().default(null),
    toStatus: z.enum(RISK_STATUSES).nullable().default(null),
    metadata: z.record(z.string(), z.unknown()).default({}),
    mentionedUserIds: z.array(z.uuid()).max(20).default([]),
    occurredAt: z.iso.datetime().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.activityType === "status_changed" &&
      (!value.fromStatus ||
        !value.toStatus ||
        value.fromStatus === value.toStatus)
    )
      context.addIssue({
        code: "custom",
        path: ["toStatus"],
        message: "Status changes require distinct from and to statuses",
      });
  });

export type RiskActivityInput = z.input<typeof riskActivityInputSchema>;

export function buildRiskActivityRecord(
  context: ActorContext,
  input: RiskActivityInput,
) {
  const value = riskActivityInputSchema.parse(input);
  return {
    organization_id: context.organizationId,
    risk_id: value.riskId,
    actor_type: value.actorType,
    actor_user_id: value.actorType === "user" ? context.userId : null,
    activity_type: value.activityType,
    from_status: value.fromStatus,
    to_status: value.toStatus,
    summary: value.summary,
    metadata: value.metadata as Json,
    mentioned_user_ids: value.mentionedUserIds,
    occurred_at: value.occurredAt ?? new Date().toISOString(),
  };
}

export class RiskActivityService {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async append(context: ActorContext, input: RiskActivityInput) {
    const record = buildRiskActivityRecord(context, input);
    const [{ data: risk, error: riskError }, mentioned] = await Promise.all([
      this.client
        .from("risks")
        .select("id")
        .eq("id", record.risk_id)
        .eq("organization_id", context.organizationId)
        .maybeSingle(),
      record.mentioned_user_ids.length
        ? this.client
            .from("users")
            .select("id")
            .eq("organization_id", context.organizationId)
            .in("id", record.mentioned_user_ids)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (riskError) throw new Error(riskError.message);
    if (!risk) throw new Error("Risk not found.");
    if (mentioned.error) throw new Error(mentioned.error.message);
    if (
      (mentioned.data ?? []).length !== new Set(record.mentioned_user_ids).size
    )
      throw new Error("Mentioned user not found.");
    const { data, error } = await this.client
      .from("risk_activities")
      .insert(record)
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Activity was not recorded.");
    return data;
  }
}
