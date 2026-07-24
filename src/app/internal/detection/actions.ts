"use server";

import { revalidatePath } from "next/cache";

import { runDetection } from "@/features/detection/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { assertInternalAdmin } from "@/lib/auth/internal-admin";

export async function runDetectionManuallyAction() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Manual detection is disabled in production.");
  }
  const context = await requireActorContext();
  assertInternalAdmin(context);
  const result = await runDetection({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    source: "manual",
  });
  revalidatePath("/brief");
  revalidatePath("/risks");
  revalidatePath("/projects");
  return result;
}
