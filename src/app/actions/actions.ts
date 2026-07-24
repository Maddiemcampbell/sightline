"use server";

import { revalidatePath } from "next/cache";

import { mutateAction } from "@/features/actions/mutate";
import type { ActionMutationInput } from "@/features/actions/validation";

export async function mutateRecommendedAction(input: ActionMutationInput) {
  const action = await mutateAction(input);
  revalidatePath("/actions");
  revalidatePath("/brief");
  revalidatePath(`/risks/${action.risk_id}`);
  return action;
}
