import type { ActorType, RiskActivityType } from "@/domain/types";

export type TimelineItem = Readonly<{
  id: string;
  riskId: string;
  riskTitle: string;
  projectName: string | null;
  activityType: RiskActivityType;
  actorType: ActorType;
  actorName: string | null;
  actorAvatarUrl: string | null;
  summary: string;
  mentionedNames: readonly string[];
  occurredAt: string;
}>;
