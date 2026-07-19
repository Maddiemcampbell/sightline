import type { RiskSeverity } from "@/domain/types";

export type BriefRiskView = Readonly<{
  id: string;
  priority: 1 | 2 | 3;
  title: string;
  severity: RiskSeverity;
  projectId: string;
  projectName: string;
  projectSubtitle: string;
  exposureCents: number;
  marginImpactCents: number;
  whyItMatters: string;
  evidenceTitle: string;
  evidenceDetail: string;
  confidenceScore: number;
  recommendedAction: string;
  acknowledged: boolean;
}>;

export type ProjectGlanceView = Readonly<{
  id: string;
  name: string;
  location: string;
  openRiskCount: number;
}>;

export type DailyBriefView = Readonly<{
  briefId: string;
  briefDate: string;
  totalProfitAtRiskCents: number;
  activeProjectCount: number;
  openRiskCount: number;
  overallRiskLevel: "Low" | "Moderate" | "High" | "Critical";
  risks: readonly BriefRiskView[];
  projects: readonly ProjectGlanceView[];
  recentResolutions: readonly {
    id: string;
    title: string;
    projectName: string;
  }[];
  sources: readonly { id: string; name: string; lastSyncedAt: string | null }[];
}>;
