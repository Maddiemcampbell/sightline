import { z } from "zod";

import { PLATFORM_PERMISSIONS } from "./types";

export const createOperatorSchema = z.object({
  email: z
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(1).max(120),
  mfaRequired: z.boolean(),
  permissions: z
    .array(z.enum(PLATFORM_PERMISSIONS))
    .min(1, "Select at least one permission."),
});

export const updateOperatorSchema = z.object({
  id: z.uuid(),
  displayName: z.string().trim().min(1).max(120),
  status: z.enum(["active", "suspended"]),
  mfaRequired: z.boolean(),
  permissions: z
    .array(z.enum(PLATFORM_PERMISSIONS))
    .min(1, "Select at least one permission."),
});

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>;
export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;
