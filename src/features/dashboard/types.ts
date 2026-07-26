import type { TimelineItem } from "@/features/activity/types";
import type { ActionOwner, ActionView } from "@/features/actions/types";
import type {
  ProjectRow,
  RecommendedActionRow,
  RiskActivityRow,
  RiskResolutionRow,
  RiskRow,
  UserRow,
} from "@/lib/supabase/database-row.types";
import type {
  HomepageIntelligence,
  PortfolioObservation,
} from "@/features/portfolio-intelligence/types";

export type DashboardSource = Readonly<{
  now: Date;
  currentUserId: string;
  currentUser: Pick<UserRow, "id" | "full_name">;
  projects: readonly ProjectRow[];
  risks: readonly RiskRow[];
  actions: readonly RecommendedActionRow[];
  activities: readonly RiskActivityRow[];
  resolutions: readonly RiskResolutionRow[];
  users: readonly Pick<UserRow, "id" | "full_name">[];
}>;

export type Comparison = Readonly<{
  value: number;
  previousValue: number | null;
}>;

export type PriorityItem = Readonly<{
  id: string;
  kind: "risk" | "action";
  title: string;
  projectId: string | null;
  projectName: string;
  reason: string;
  exposureCents: number | null;
  ownerName: string;
  dueAt: string | null;
  status: string;
  nextAction: string;
  href: string;
  score: number;
}>;

export type PortfolioHealthRow = Readonly<{
  id: string;
  name: string;
  location: string;
  projectedMarginCents: number | null;
  openRiskCount: number;
  exposureCents: number;
  trend: "up" | "down" | "steady" | "insufficient";
  topIssue: string | null;
  concernScore: number;
}>;

export type RiskDriver = Readonly<{
  category: string;
  label: string;
  riskCount: number;
  exposureCents: number;
  level: "high" | "medium" | "low";
}>;

export type PortfolioRiskHeatmapRow = Readonly<{
  projectId: string;
  projectName: string;
  cells: Readonly<
    Record<
      "schedule" | "budget" | "resources" | "contracts" | "design",
      "critical" | "high" | "medium" | "low" | null
    >
  >;
}>;

export type WorkInMotion = Readonly<{
  dueToday: readonly ActionView[];
  overdue: readonly ActionView[];
  unownedRisks: readonly {
    id: string;
    title: string;
    projectName: string;
  }[];
  waitingExternal: readonly ActionView[];
  recentlyCompleted: readonly ActionView[];
}>;

export type DashboardView = Readonly<{
  generatedAt: string;
  timezone: string;
  currentUserName: string;
  canViewFinancials: boolean;
  isEmptyOrganization: boolean;
  hasActiveRisks: boolean;
  overnight: {
    newRisks: Comparison;
    resolvedRisks: Comparison;
    overdueActions: Comparison;
    awaitingUser: Comparison;
    exposureDeltaCents: Comparison;
  };
  priorities: readonly PriorityItem[];
  portfolio: readonly PortfolioHealthRow[];
  portfolioSummary: {
    activeProjects: number;
    projectsAtRisk: number;
    totalExposureCents: number;
    forecastMarginPercent: number | null;
  };
  riskDrivers: readonly RiskDriver[];
  riskHeatmap: readonly PortfolioRiskHeatmapRow[];
  work: WorkInMotion;
  activity: readonly TimelineItem[];
  value: {
    risksResolved: number;
    estimatedExposureReducedCents: number;
    estimatedLossAvoidedCents: number | null;
    averageResolutionHours: number | null;
    actionCompletionRate: number | null;
  };
  owners: readonly ActionOwner[];
  observations: readonly PortfolioObservation[];
  intelligence: HomepageIntelligence;
}>;
