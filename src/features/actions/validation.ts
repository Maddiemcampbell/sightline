import { z } from "zod";

import { ACTION_PRIORITIES } from "@/domain/types";

export const actionMutationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("accept"), actionId: z.uuid() }).strict(),
  z.object({ operation: z.literal("start"), actionId: z.uuid() }).strict(),
  z.object({ operation: z.literal("complete"), actionId: z.uuid() }).strict(),
  z
    .object({
      operation: z.literal("assign"),
      actionId: z.uuid(),
      ownerUserId: z.uuid().nullable(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("priority"),
      actionId: z.uuid(),
      priority: z.enum(ACTION_PRIORITIES),
    })
    .strict(),
  z
    .object({
      operation: z.literal("due_date"),
      actionId: z.uuid(),
      dueAt: z.iso.datetime({ offset: true }).nullable(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("dismiss"),
      actionId: z.uuid(),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict(),
]);

export type ActionMutationInput = z.input<typeof actionMutationSchema>;

export const actionFiltersSchema = z.object({
  search: z.string().trim().max(120).catch(""),
  status: z
    .enum([
      "all",
      "suggested",
      "accepted",
      "in_progress",
      "completed",
      "dismissed",
    ])
    .catch("all"),
  owner: z.string().catch("all"),
  priority: z.enum(["all", ...ACTION_PRIORITIES]).catch("all"),
  project: z.string().catch("all"),
  due: z.enum(["all", "overdue", "today", "week", "none"]).catch("all"),
});
