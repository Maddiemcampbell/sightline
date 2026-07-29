import { z } from "zod";

const internalAdminListSchema = z
  .string()
  .optional()
  .transform(
    (value) =>
      value
        ?.split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean) ?? [],
  )
  .pipe(z.array(z.uuid()));

export function readInternalAdminAuthUserIds(value?: string) {
  return new Set(internalAdminListSchema.parse(value));
}

export function isInternalAdminAuthUser(
  authUserId: string,
  value = process.env.INTERNAL_ADMIN_AUTH_USER_IDS,
) {
  return readInternalAdminAuthUserIds(value).has(authUserId.toLowerCase());
}
