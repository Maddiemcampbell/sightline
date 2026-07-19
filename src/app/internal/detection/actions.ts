"use server";

import { revalidatePath } from "next/cache";

import { runDetection } from "@/features/detection/service";
import { requireActorContext } from "@/lib/auth/request-context";

export async function runDetectionManuallyAction() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Manual detection is disabled in production.");
  }
  await requireActorContext();
  const result = await runDetection({ source: "manual" });
  revalidatePath("/brief");
  revalidatePath("/risks");
  revalidatePath("/projects");
  return result;
}
