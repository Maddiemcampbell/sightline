import "server-only";

import { NotificationRepository } from "@/features/notifications/repository";
import { notificationInputSchema } from "@/features/notifications/validation";

export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}

  async notify(input: unknown) {
    const value = notificationInputSchema.parse(input);
    if (value.recipientMembershipId === value.actorMembershipId) return;
    await this.repository.create({
      organizationId: value.organizationId,
      recipientMembershipId: value.recipientMembershipId,
      type: value.type,
      title: value.title,
      body: value.body,
      ...(value.actorMembershipId !== undefined
        ? { actorMembershipId: value.actorMembershipId }
        : {}),
      ...(value.href !== undefined ? { href: value.href } : {}),
    });
  }
}
