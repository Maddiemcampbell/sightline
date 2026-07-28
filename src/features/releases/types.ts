export const RELEASE_STATUSES = [
  "planned",
  "deploying",
  "deployed",
  "failed",
  "rolled_back",
] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export type Release = Readonly<{
  id: string;
  identifier: string;
  applicationVersion: string;
  environment: string;
  status: ReleaseStatus;
  deployedAt: string | null;
  commitSha: string | null;
  sourceReference: string | null;
  deployedBy: string | null;
  releaseNotes: string;
  rollbackStatus: "not_rolled_back" | "rollback_pending" | "rolled_back";
  linkedFlags: readonly Readonly<{ id: string; key: string; name: string }>[];
  createdAt: string;
  updatedAt: string;
}>;
