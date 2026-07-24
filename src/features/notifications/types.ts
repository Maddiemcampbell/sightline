export const NOTIFICATION_TYPES = [
  "mention",
  "assignment",
  "role_change",
  "invitation",
  "project_added",
  "risk_assigned",
  "action_completed",
  "data_export_ready",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationView = Readonly<{
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}>;
