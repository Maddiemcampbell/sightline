"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCurrentMembership } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotificationRepository } from "@/features/notifications/repository";

const idSchema = z.uuid();

export async function markNotificationReadAction(id: string) {
  const membership = await requireCurrentMembership();
  await new NotificationRepository(await createServerSupabaseClient()).markRead(
    membership.organizationId,
    membership.id,
    idSchema.parse(id),
  );
  revalidatePath("/");
}

export async function markAllNotificationsReadAction() {
  const membership = await requireCurrentMembership();
  await new NotificationRepository(
    await createServerSupabaseClient(),
  ).markAllRead(membership.organizationId, membership.id);
  revalidatePath("/");
}
