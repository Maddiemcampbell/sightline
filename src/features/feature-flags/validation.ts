import { z } from "zod";

const commaSeparated = z
  .string()
  .max(4_000)
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const commaSeparatedUuids = commaSeparated.pipe(z.array(z.uuid()).max(100));

export const featureFlagMutationSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9._-]{2,79}$/, "Use a stable lowercase flag key."),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1_000),
  enabled: z.boolean(),
  defaultEnabled: z.boolean(),
  environments: commaSeparated.pipe(
    z.array(z.enum(["development", "preview", "production", "test"])).max(4),
  ),
  organizationIds: commaSeparatedUuids,
  userIds: commaSeparatedUuids,
  rolloutPercentage: z.coerce.number().int().min(0).max(100),
});

export type FeatureFlagMutation = z.infer<typeof featureFlagMutationSchema>;
