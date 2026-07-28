import { z } from "zod";

const pageSizeSchema = z.coerce
  .number()
  .pipe(z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]))
  .catch(25);
const querySchema = z
  .string()
  .trim()
  .max(120)
  .transform((value) => value.replace(/[(),]/g, " ").replace(/\s+/g, " "));

export const organizationListInputSchema = z.object({
  query: querySchema.catch(""),
  status: z
    .enum(["all", "active", "pending_deletion", "archived"])
    .catch("all"),
  members: z.enum(["all", "yes", "no"]).catch("all"),
  issues: z.enum(["all", "yes", "no"]).catch("all"),
  recentDays: z
    .union([
      z.literal("all"),
      z.coerce
        .number()
        .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])),
    ])
    .catch("all"),
  createdDays: z
    .union([
      z.literal("all"),
      z.coerce
        .number()
        .pipe(z.union([z.literal(30), z.literal(90), z.literal(365)])),
    ])
    .catch("all"),
  sort: z.enum(["activity", "created", "name", "members"]).catch("activity"),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: pageSizeSchema,
});

export const userListInputSchema = z.object({
  query: querySchema.catch(""),
  status: z
    .enum(["all", "active", "unverified", "suspended", "deleted"])
    .catch("all"),
  membership: z.enum(["all", "yes", "no"]).catch("all"),
  loginDays: z
    .union([
      z.literal("all"),
      z.literal("never"),
      z.coerce
        .number()
        .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])),
    ])
    .catch("all"),
  createdDays: z
    .union([
      z.literal("all"),
      z.coerce
        .number()
        .pipe(z.union([z.literal(30), z.literal(90), z.literal(365)])),
    ])
    .catch("all"),
  mfa: z.enum(["all", "yes", "no"]).catch("all"),
  sort: z.enum(["login", "created", "name", "email"]).catch("login"),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: pageSizeSchema,
});

export const globalDirectoryQuerySchema = z
  .string()
  .trim()
  .max(120)
  .transform((value) =>
    value.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim(),
  )
  .refine(
    (value) => z.uuid().safeParse(value).success || value.length >= 2,
    "Enter at least two characters.",
  );

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
