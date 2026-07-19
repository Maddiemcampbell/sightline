import type {
  ActionPriority,
  ActionSource,
  ActionStatus,
  ActionType,
} from "@/domain/types";

export type ActionView = Readonly<{
  id: string;
  riskId: string;
  title: string;
  description: string;
  actionType: ActionType;
  status: ActionStatus;
  priority: ActionPriority;
  ownerUserId: string | null;
  ownerName: string | null;
  dueAt: string | null;
  completedAt: string | null;
  dismissedAt: string | null;
  dismissalReason: string | null;
  source: ActionSource;
}>;

export type ActionOwner = Readonly<{ id: string; name: string }>;
