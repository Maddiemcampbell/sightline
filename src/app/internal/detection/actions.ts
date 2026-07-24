"use server";

import { revalidatePath } from "next/cache";

import { runDetection } from "@/features/detection/service";
import { requireActorContext } from "@/lib/auth/request-context";
import {
  assertAuthorized,
  canAccessInternalAdmin,
} from "@/lib/auth/authorization";

export async function runDetectionManuallyAction() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Manual detection is disabled in production.");
  }
  const context = await requireActorContext();
  assertAuthorized(canAccessInternalAdmin(context));
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
