export const RISK_CATEGORIES = [
  "insurance",
  "schedule",
  "documentation",
  "contract",
  "safety",
  "financial",
  "vendor",
  "weather",
  "other",
] as const;

export const RISK_STATUSES = [
  "monitoring",
  "action_needed",
  "in_progress",
  "resolved",
  "dismissed",
] as const;

export const RISK_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number];
export type RiskStatus = (typeof RISK_STATUSES)[number];
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];
export type UserRole = "executive" | "operations" | "project_manager" | "admin";
export type ProjectStatus =
  "planning" | "active" | "on_hold" | "complete" | "cancelled";
export type DocumentType =
  | "contract"
  | "insurance"
  | "daily_log"
  | "rfi"
  | "schedule"
  | "change_order"
  | "incident_report"
  | "safety"
  | "financial"
  | "other";
export type DocumentProcessingStatus = "pending" | "ready" | "failed";
export type ActionStatus = "open" | "in_progress" | "complete" | "dismissed";
export type BriefStatus = "draft" | "published";
export type IntegrationProvider =
  "manual" | "procore" | "autodesk" | "email" | "sharepoint" | "other";
export type RiskActivityType =
  | "created"
  | "status_changed"
  | "assigned"
  | "commented"
  | "evidence_added"
  | "action_updated"
  | "resolved"
  | "dismissed";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  authUserId: string | null;
  email: string;
  fullName: string;
  title: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  projectNumber: string;
  status: ProjectStatus;
  addressLine1: string | null;
  city: string | null;
  stateCode: string | null;
  postalCode: string | null;
  contractValueCents: number | null;
  projectedMarginCents: number;
  startDate: string | null;
  targetCompletionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  trade: string | null;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  organizationId: string;
  projectId: string | null;
  vendorId: string | null;
  integrationSourceId: string | null;
  name: string;
  documentType: DocumentType;
  storagePath: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  processingStatus: DocumentProcessingStatus;
  archivedAt: string | null;
  externalId: string | null;
  documentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Risk {
  id: string;
  organizationId: string;
  projectId: string | null;
  vendorId: string | null;
  assignedUserId: string | null;
  detectionKey: string | null;
  title: string;
  summary: string;
  category: RiskCategory;
  severity: RiskSeverity;
  status: RiskStatus;
  potentialExposureCents: number;
  estimatedMarginImpactCents: number;
  confidenceScore: number;
  whyItMatters: string;
  detectedAt: string;
  dueAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RiskEvidence {
  id: string;
  organizationId: string;
  riskId: string;
  documentId: string | null;
  detectionKey: string | null;
  integrationSourceId: string | null;
  title: string;
  description: string;
  sourceExcerpt: string | null;
  observedAt: string;
  createdAt: string;
}

export interface RecommendedAction {
  id: string;
  organizationId: string;
  riskId: string;
  assignedUserId: string | null;
  detectionKey: string | null;
  title: string;
  description: string;
  status: ActionStatus;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyBrief {
  id: string;
  organizationId: string;
  briefDate: string;
  status: BriefStatus;
  headline: string;
  introduction: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BriefItem {
  id: string;
  organizationId: string;
  dailyBriefId: string;
  riskId: string;
  priority: 1 | 2 | 3;
  headline: string;
  summary: string;
  recommendedNextStep: string;
  createdAt: string;
}

export interface RiskActivity {
  id: string;
  organizationId: string;
  riskId: string;
  actorUserId: string | null;
  activityType: RiskActivityType;
  fromStatus: RiskStatus | null;
  toStatus: RiskStatus | null;
  note: string | null;
  metadata: Readonly<Record<string, unknown>>;
  occurredAt: string;
  createdAt: string;
}

export interface IntegrationSource {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  name: string;
  externalAccountId: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
