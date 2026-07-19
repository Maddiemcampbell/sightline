export type NotificationMessage = Readonly<{
  organizationId: string;
  recipientUserId: string;
  kind: "action_assigned" | "action_due" | "risk_resolved";
  subject: string;
  body: string;
  idempotencyKey: string;
}>;

export interface NotificationService {
  send(message: NotificationMessage): Promise<{ messageId: string }>;
}

export class DisabledNotificationService implements NotificationService {
  async send(): Promise<{ messageId: string }> {
    throw new Error("V2 notifications are disabled.");
  }
}
