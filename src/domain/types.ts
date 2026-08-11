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
export const EVIDENCE_TYPES = [
  "document_excerpt",
  "contract_clause",
  "insurance_expiration",
  "daily_log_entry",
  "weather_event",
  "schedule_event",
  "project_metadata",
  "historical_risk",
  "manual_note",
  "system_rule",
] as const;
export const EVIDENCE_SUPPORT_TYPES = [
  "direct",
  "inferred",
  "assumption",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export type EvidenceSupportType = (typeof EVIDENCE_SUPPORT_TYPES)[number];
export const ACTION_TYPES = [
  "email",
  "review_document",
  "contact_vendor",
  "notify_team",
  "schedule_meeting",
  "open_rfi",
  "request_document",
  "update_schedule",
  "add_mitigation",
  "other",
] as const;
export const ACTION_STATUSES = [
  "suggested",
  "accepted",
  "in_progress",
  "completed",
  "dismissed",
] as const;
export const ACTION_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const ACTION_SOURCES = [
  "human",
  "deterministic_rule",
  "ai_suggestion",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type ActionPriority = "low" | "normal" | "high" | "urgent";
export type ActionSource = (typeof ACTION_SOURCES)[number];
export type ResolutionType =
  "mitigated" | "avoided" | "accepted" | "realized" | "unknown";
export type BriefStatus = "draft" | "published";
export type IntegrationProvider =
  "manual" | "procore" | "autodesk" | "email" | "sharepoint" | "other";
export const RISK_ACTIVITY_TYPES = [
  "risk_detected",
  "risk_acknowledged",
  "risk_updated",
  "status_changed",
  "severity_changed",
  "owner_assigned",
  "due_date_changed",
  "action_suggested",
  "action_accepted",
  "action_started",
  "action_completed",
  "action_dismissed",
  "evidence_added",
  "document_uploaded",
  "email_drafted",
  "email_marked_sent",
  "commitment_tracked",
  "commitment_response_received",
  "commitment_resolved",
  "commitment_reminder_created",
  "comment_added",
  "risk_resolved",
  "risk_reopened",
  "system_analysis_completed",
] as const;
export const ACTOR_TYPES = ["user", "system", "ai", "integration"] as const;
export type RiskActivityType = (typeof RISK_ACTIVITY_TYPES)[number];
export type LegacyRiskActivityType =
  | "created"
  | "assigned"
  | "commented"
  | "action_updated"
  | "resolved"
  | "dismissed";
export type ActorType = (typeof ACTOR_TYPES)[number];

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
  emailDeliveryEnabled: boolean;
  preferredDeliveryTime: string;
  deliveryTimezone: string;
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
  evidenceType: EvidenceType;
  title: string;
  excerpt: string;
  sourceLabel: string;
  sourceLocation: string | null;
  pageNumber: number | null;
  lineStart: number | null;
  lineEnd: number | null;
  occurredAt: string;
  relevanceScore: number;
  supportType: EvidenceSupportType;
  whyItMatters: string;
  createdAt: string;
}

export interface RecommendedAction {
  id: string;
  organizationId: string;
  riskId: string;
  ownerUserId: string | null;
  detectionKey: string | null;
  title: string;
  description: string;
  actionType: ActionType;
  status: ActionStatus;
  priority: ActionPriority;
  dueAt: string | null;
  completedAt: string | null;
  dismissedAt: string | null;
  dismissalReason: string | null;
  createdBy: string;
  source: ActionSource;
  createdAt: string;
  updatedAt: string;
}

export interface RiskResolution {
  id: string;
  organizationId: string;
  riskId: string;
  resolvedByUserId: string;
  resolutionType: ResolutionType;
  summary: string;
  realizedImpactCents: number | null;
  resolvedAt: string;
  createdAt: string;
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
  actorType: ActorType;
  activityType: RiskActivityType | LegacyRiskActivityType;
  fromStatus: RiskStatus | null;
  toStatus: RiskStatus | null;
  summary: string;
  mentionedUserIds: readonly string[];
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
