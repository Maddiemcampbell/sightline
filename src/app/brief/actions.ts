"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { RiskManagementService } from "@/features/risks/service";
import { runServerMutation } from "@/lib/server-mutation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const riskIdSchema = z.uuid();
const dismissSchema = z.object({
  riskId: z.uuid(),
  reason: z.string().trim().min(10).max(500),
});

export async function acknowledgeRiskAction(riskId: string): Promise<void> {
  await runServerMutation(riskIdSchema, riskId, async (context, id) => {
    const service = new RiskManagementService(
      await createServerSupabaseClient(),
    );
    await service.acknowledge(context, id);
  });
  revalidatePath("/brief");
}

export async function dismissRiskAction(input: {
  riskId: string;
  reason: string;
}): Promise<void> {
  await runServerMutation(dismissSchema, input, async (context, value) => {
    const service = new RiskManagementService(
      await createServerSupabaseClient(),
    );
    await service.dismiss(context, { ...value, source: "daily_brief" });
  });
  revalidatePath("/brief");
}
