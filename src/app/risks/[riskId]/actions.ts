"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  BUILDCO_ORGANIZATION_ID,
  MATT_USER_ID,
} from "@/features/daily-brief/data";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const mutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("resolve"), riskId: z.uuid() }),
  z.object({
    kind: z.literal("assign"),
    riskId: z.uuid(),
    userId: z.uuid().nullable(),
  }),
  z.object({
    kind: z.literal("due"),
    riskId: z.uuid(),
    dueDate: z.iso.date().nullable(),
  }),
]);

export async function updateRiskDetailAction(
  input: z.input<typeof mutationSchema>,
) {
  const value = mutationSchema.parse(input);
  const client = createAdminSupabaseClient();
  const { data: risk, error } = await client
    .from("risks")
    .select("*")
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", value.riskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!risk) throw new Error("Risk not found");

  if (value.kind === "assign" && value.userId) {
    const { data: owner, error: ownerError } = await client
      .from("users")
      .select("id")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("id", value.userId)
      .maybeSingle();
    if (ownerError) throw new Error(ownerError.message);
    if (!owner) throw new Error("Owner not found");
  }

  const patch =
    value.kind === "resolve"
      ? {
          status: "resolved" as const,
          resolved_at: new Date().toISOString(),
        }
      : value.kind === "assign"
        ? { assigned_user_id: value.userId }
        : {
            due_at: value.dueDate ? `${value.dueDate}T17:00:00.000Z` : null,
          };
  const { error: updateError } = await client
    .from("risks")
    .update(patch)
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", value.riskId);
  if (updateError) throw new Error(updateError.message);
  const activityType =
    value.kind === "resolve"
      ? "resolved"
      : value.kind === "assign"
        ? "assigned"
        : "commented";
  const note =
    value.kind === "resolve"
      ? "Risk marked resolved."
      : value.kind === "assign"
        ? "Risk owner updated."
        : "Risk due date updated.";
  const { error: activityError } = await client.from("risk_activities").insert({
    organization_id: BUILDCO_ORGANIZATION_ID,
    risk_id: value.riskId,
    actor_user_id: MATT_USER_ID,
    activity_type: activityType,
    from_status: risk.status,
    to_status: value.kind === "resolve" ? "resolved" : risk.status,
    note,
    metadata: { source: "risk_detail" },
    occurred_at: new Date().toISOString(),
  });
  if (activityError) throw new Error(activityError.message);
  revalidatePath(`/risks/${value.riskId}`);
  revalidatePath("/risks");
  revalidatePath("/projects");
}
