export const MEETING_TYPES = [
  "weekly_executive_review",
  "monthly_portfolio_review",
  "project_owner_meeting",
  "lender_board_update",
  "risk_committee_briefing",
] as const;

export type MeetingType = (typeof MEETING_TYPES)[number];

export type AgendaItem = Readonly<{
  id: string;
  section: "opening" | "attention" | "decisions" | "commitments" | "closeout";
  title: string;
  detail: string;
  sourceHref: string | null;
  sourceLabel: string | null;
}>;

export const meetingTypeLabels: Record<MeetingType, string> = {
  weekly_executive_review: "Weekly executive review",
  monthly_portfolio_review: "Monthly portfolio review",
  project_owner_meeting: "Project owner meeting",
  lender_board_update: "Lender or board update",
  risk_committee_briefing: "Risk committee briefing",
};
