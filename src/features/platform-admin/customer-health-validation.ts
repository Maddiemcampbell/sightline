import { z } from "zod";

export const customerHealthListInputSchema = z.object({
  query: z.string().trim().max(120).catch(""),
  status: z.enum(["all", "healthy", "watch", "needs_attention"]).catch("all"),
  sort: z
    .enum(["health", "login", "activity", "onboarding", "adoption", "jobs"])
    .catch("health"),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .pipe(
      z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]),
    )
    .catch(25),
});
