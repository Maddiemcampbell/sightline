import "server-only";

import type { z } from "zod";

import { requireActorContext } from "@/lib/auth/request-context";
import type { ActorContext } from "@/lib/auth/authorization";

export async function runServerMutation<TSchema extends z.ZodType, TResult>(
  schema: TSchema,
  input: z.input<TSchema>,
  mutation: (
    context: ActorContext,
    value: z.output<TSchema>,
  ) => Promise<TResult>,
): Promise<TResult> {
  const value = schema.parse(input);
  const context = await requireActorContext();
  return mutation(context, value);
}
