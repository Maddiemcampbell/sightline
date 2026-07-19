"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  BUILDCO_ORGANIZATION_ID,
  MATT_USER_ID,
} from "@/features/daily-brief/data";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const riskIdSchema = z.uuid();
const dismissSchema = z.object({
  riskId: z.uuid(),
  reason: z.string().trim().min(10).max(500),
});

async function requireScopedRisk(riskId: string) {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("risks")
    .select("id,status")
    .eq("id", riskId)
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Risk not found");
  return { client, risk: data };
}

export async function acknowledgeRiskAction(riskId: string): Promise<void> {
  const id = riskIdSchema.parse(riskId);
  const { client } = await requireScopedRisk(id);
  const { error } = await client.from("risk_activities").insert({
    organization_id: BUILDCO_ORGANIZATION_ID,
    risk_id: id,
    actor_user_id: MATT_USER_ID,
    activity_type: "commented",
    note: "Risk acknowledged from the Daily Brief.",
    metadata: { acknowledged: true, source: "daily_brief" },
    occurred_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/brief");
}

export async function dismissRiskAction(input: {
  riskId: string;
  reason: string;
}): Promise<void> {
  const value = dismissSchema.parse(input);
  const { client, risk } = await requireScopedRisk(value.riskId);
  const { error: updateError } = await client
    .from("risks")
    .update({ status: "dismissed", resolved_at: null })
    .eq("id", value.riskId)
    .eq("organization_id", BUILDCO_ORGANIZATION_ID);
  if (updateError) throw new Error(updateError.message);
  const { error: activityError } = await client.from("risk_activities").insert({
    organization_id: BUILDCO_ORGANIZATION_ID,
    risk_id: value.riskId,
    actor_user_id: MATT_USER_ID,
    activity_type: "dismissed",
    from_status: risk.status,
    to_status: "dismissed",
    note: value.reason,
    metadata: { source: "daily_brief" },
    occurred_at: new Date().toISOString(),
  });
  if (activityError) {
    await client
      .from("risks")
      .update({ status: risk.status })
      .eq("id", value.riskId);
    throw new Error(activityError.message);
  }
  revalidatePath("/brief");
}
