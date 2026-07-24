import { z } from "zod";

import { NOTIFICATION_TYPES } from "@/features/notifications/types";

export const notificationInputSchema = z.object({
  organizationId: z.uuid(),
  recipientMembershipId: z.uuid(),
  actorMembershipId: z.uuid().nullable().optional(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(1000).default(""),
  href: z.string().regex(/^\/[A-Za-z0-9/_?&=.-]*$/).nullable().optional(),
});
