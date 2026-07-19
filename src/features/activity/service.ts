import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { Json } from "@/lib/supabase/database.types";

export const riskActivityInputSchema = z.object({
  riskId: z.uuid(),
  activityType: z.enum([
    "created",
    "status_changed",
    "assigned",
    "commented",
    "evidence_added",
    "action_updated",
    "resolved",
    "dismissed",
  ]),
  fromStatus: z
    .enum([
      "monitoring",
      "action_needed",
      "in_progress",
      "resolved",
      "dismissed",
    ])
    .nullable()
    .default(null),
  toStatus: z
    .enum([
      "monitoring",
      "action_needed",
      "in_progress",
      "resolved",
      "dismissed",
    ])
    .nullable()
    .default(null),
  note: z.string().trim().min(1).max(2_000).nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.iso.datetime().optional(),
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
    actor_user_id: context.userId,
    activity_type: value.activityType,
    from_status: value.fromStatus,
    to_status: value.toStatus,
    note: value.note,
    metadata: value.metadata as Json,
    occurred_at: value.occurredAt ?? new Date().toISOString(),
  };
}

export class RiskActivityService {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async append(context: ActorContext, input: RiskActivityInput): Promise<void> {
    const record = buildRiskActivityRecord(context, input);
    const { data: risk, error: riskError } = await this.client
      .from("risks")
      .select("id")
      .eq("id", record.risk_id)
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    if (riskError) throw new Error(riskError.message);
    if (!risk) throw new Error("Risk not found.");
    const { error } = await this.client.from("risk_activities").insert(record);
    if (error) throw new Error(error.message);
  }
}
