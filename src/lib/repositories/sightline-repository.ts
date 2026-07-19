import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BriefItem,
  DailyBrief,
  Document,
  IntegrationSource,
  Organization,
  Project,
  RecommendedAction,
  Risk,
  RiskActivity,
  RiskEvidence,
  User,
  Vendor,
} from "@/domain/types";
import {
  createBriefItemSchema,
  createDailyBriefSchema,
  createDocumentSchema,
  createIntegrationSourceSchema,
  createOrganizationSchema,
  createProjectSchema,
  createRecommendedActionSchema,
  createRiskActivitySchema,
  createRiskEvidenceSchema,
  createRiskSchema,
  createUserSchema,
  createVendorSchema,
  updateRiskSchema,
  type CreateBriefItemInput,
  type CreateDailyBriefInput,
  type CreateDocumentInput,
  type CreateIntegrationSourceInput,
  type CreateOrganizationInput,
  type CreateProjectInput,
  type CreateRecommendedActionInput,
  type CreateRiskActivityInput,
  type CreateRiskEvidenceInput,
  type CreateRiskInput,
  type CreateUserInput,
  type CreateVendorInput,
  type UpdateRiskInput,
} from "@/domain/validation";
import type {
  BriefItemRow,
  DailyBriefRow,
  DocumentRow,
  IntegrationSourceRow,
  OrganizationRow,
  ProjectRow,
  RecommendedActionRow,
  RiskActivityRow,
  RiskEvidenceRow,
  RiskRow,
  UserRow,
  VendorRow,
  Json,
} from "@/lib/supabase/database-row.types";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { Database } from "@/lib/supabase/database.types";

export type DailyBriefWithItems = Readonly<{
  brief: DailyBrief;
  items: readonly BriefItem[];
}>;

export type RiskQuery = Readonly<{
  organizationId: string;
  projectId?: string;
  status?: Risk["status"];
  detectedAfter?: string;
  limit?: number;
}>;

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }
  if (data === null) {
    throw new Error("Supabase returned no data");
  }
  return data;
}

function isJsonObject(
  value: Json,
): value is { readonly [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const mapOrganization = (row: OrganizationRow): Organization => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  timezone: row.timezone,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapUser = (row: UserRow): User => ({
  id: row.id,
  organizationId: row.organization_id,
  authUserId: row.auth_user_id,
  email: row.email,
  fullName: row.full_name,
  title: row.title,
  role: row.role,
  emailDeliveryEnabled: row.email_delivery_enabled,
  preferredDeliveryTime: row.preferred_delivery_time,
  deliveryTimezone: row.delivery_timezone,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapProject = (row: ProjectRow): Project => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  projectNumber: row.project_number,
  status: row.status,
  addressLine1: row.address_line_1,
  city: row.city,
  stateCode: row.state_code,
  postalCode: row.postal_code,
  contractValueCents: row.contract_value_cents,
  projectedMarginCents: row.projected_margin_cents,
  startDate: row.start_date,
  targetCompletionDate: row.target_completion_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapVendor = (row: VendorRow): Vendor => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  trade: row.trade,
  contactName: row.contact_name,
  contactEmail: row.contact_email,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapIntegrationSource = (
  row: IntegrationSourceRow,
): IntegrationSource => ({
  id: row.id,
  organizationId: row.organization_id,
  provider: row.provider,
  name: row.name,
  externalAccountId: row.external_account_id,
  isActive: row.is_active,
  lastSyncedAt: row.last_synced_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDocument = (row: DocumentRow): Document => ({
  id: row.id,
  organizationId: row.organization_id,
  projectId: row.project_id,
  vendorId: row.vendor_id,
  integrationSourceId: row.integration_source_id,
  name: row.name,
  documentType: row.document_type,
  storagePath: row.storage_path,
  originalFilename: row.original_filename,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  processingStatus: row.processing_status,
  archivedAt: row.archived_at,
  externalId: row.external_id,
  documentDate: row.document_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRisk = (row: RiskRow): Risk => ({
  id: row.id,
  organizationId: row.organization_id,
  projectId: row.project_id,
  vendorId: row.vendor_id,
  assignedUserId: row.assigned_user_id,
  detectionKey: row.detection_key,
  title: row.title,
  summary: row.summary,
  category: row.category,
  severity: row.severity,
  status: row.status,
  potentialExposureCents: row.potential_exposure_cents,
  estimatedMarginImpactCents: row.estimated_margin_impact_cents,
  confidenceScore: row.confidence_score,
  whyItMatters: row.why_it_matters,
  detectedAt: row.detected_at,
  dueAt: row.due_at,
  resolvedAt: row.resolved_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapEvidence = (row: RiskEvidenceRow): RiskEvidence => ({
  id: row.id,
  organizationId: row.organization_id,
  riskId: row.risk_id,
  documentId: row.document_id,
  evidenceType: row.evidence_type,
  title: row.title,
  excerpt: row.excerpt,
  sourceLabel: row.source_label,
  sourceLocation: row.source_location,
  pageNumber: row.page_number,
  lineStart: row.line_start,
  lineEnd: row.line_end,
  occurredAt: row.occurred_at,
  relevanceScore: row.relevance_score,
  supportType: row.support_type,
  whyItMatters: row.why_it_matters,
  createdAt: row.created_at,
});

const mapAction = (row: RecommendedActionRow): RecommendedAction => ({
  id: row.id,
  organizationId: row.organization_id,
  riskId: row.risk_id,
  ownerUserId: row.owner_user_id,
  detectionKey: row.detection_key,
  title: row.title,
  description: row.description,
  actionType: row.action_type,
  status: row.status,
  priority: row.priority,
  dueAt: row.due_at,
  completedAt: row.completed_at,
  dismissedAt: row.dismissed_at,
  dismissalReason: row.dismissal_reason,
  createdBy: row.created_by_user_id,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapBrief = (row: DailyBriefRow): DailyBrief => ({
  id: row.id,
  organizationId: row.organization_id,
  briefDate: row.brief_date,
  status: row.status,
  headline: row.headline,
  introduction: row.introduction,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapBriefItem = (row: BriefItemRow): BriefItem => {
  if (row.priority !== 1 && row.priority !== 2 && row.priority !== 3) {
    throw new Error(`Invalid brief priority: ${row.priority}`);
  }
  return {
    id: row.id,
    organizationId: row.organization_id,
    dailyBriefId: row.daily_brief_id,
    riskId: row.risk_id,
    priority: row.priority,
    headline: row.headline,
    summary: row.summary,
    recommendedNextStep: row.recommended_next_step,
    createdAt: row.created_at,
  };
};

const mapActivity = (row: RiskActivityRow): RiskActivity => ({
  id: row.id,
  organizationId: row.organization_id,
  riskId: row.risk_id,
  actorUserId: row.actor_user_id,
  actorType: row.actor_type,
  activityType: row.activity_type,
  fromStatus: row.from_status,
  toStatus: row.to_status,
  summary: row.summary,
  mentionedUserIds: row.mentioned_user_ids,
  metadata: isJsonObject(row.metadata) ? row.metadata : {},
  occurredAt: row.occurred_at,
  createdAt: row.created_at,
});

export class SightlineRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async getOrganization(id: string): Promise<Organization | null> {
    const { data, error } = await this.client
      .from("organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapOrganization(data) : null;
  }

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    const value = createOrganizationSchema.parse(input);
    const { data, error } = await this.client
      .from("organizations")
      .insert(value)
      .select()
      .single();
    return mapOrganization(requireData(data, error));
  }

  async listUsers(organizationId: string): Promise<readonly User[]> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
      .order("full_name");
    return requireData(data, error).map(mapUser);
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const value = createUserSchema.parse(input);
    const { data, error } = await this.client
      .from("users")
      .insert({
        organization_id: value.organizationId,
        auth_user_id: value.authUserId,
        email: value.email,
        full_name: value.fullName,
        title: value.title,
        role: value.role,
        email_delivery_enabled: value.emailDeliveryEnabled,
        preferred_delivery_time: value.preferredDeliveryTime,
        delivery_timezone: value.deliveryTimezone,
      })
      .select()
      .single();
    return mapUser(requireData(data, error));
  }

  async listProjects(organizationId: string): Promise<readonly Project[]> {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");
    return requireData(data, error).map(mapProject);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const value = createProjectSchema.parse(input);
    const { data, error } = await this.client
      .from("projects")
      .insert({
        organization_id: value.organizationId,
        name: value.name,
        project_number: value.projectNumber,
        status: value.status,
        address_line_1: value.addressLine1,
        city: value.city,
        state_code: value.stateCode,
        postal_code: value.postalCode,
        contract_value_cents: value.contractValueCents,
        projected_margin_cents: value.projectedMarginCents,
        start_date: value.startDate,
        target_completion_date: value.targetCompletionDate,
      })
      .select()
      .single();
    return mapProject(requireData(data, error));
  }

  async listVendors(organizationId: string): Promise<readonly Vendor[]> {
    const { data, error } = await this.client
      .from("vendors")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");
    return requireData(data, error).map(mapVendor);
  }

  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    const value = createVendorSchema.parse(input);
    const { data, error } = await this.client
      .from("vendors")
      .insert({
        organization_id: value.organizationId,
        name: value.name,
        trade: value.trade,
        contact_name: value.contactName,
        contact_email: value.contactEmail,
      })
      .select()
      .single();
    return mapVendor(requireData(data, error));
  }

  async assignVendorToProject(input: {
    organizationId: string;
    projectId: string;
    vendorId: string;
    scopeOfWork?: string;
  }): Promise<void> {
    const { error } = await this.client.from("project_vendors").upsert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      vendor_id: input.vendorId,
      scope_of_work: input.scopeOfWork ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async listIntegrationSources(
    organizationId: string,
  ): Promise<readonly IntegrationSource[]> {
    const { data, error } = await this.client
      .from("integration_sources")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");
    return requireData(data, error).map(mapIntegrationSource);
  }

  async createIntegrationSource(
    input: CreateIntegrationSourceInput,
  ): Promise<IntegrationSource> {
    const value = createIntegrationSourceSchema.parse(input);
    const { data, error } = await this.client
      .from("integration_sources")
      .insert({
        organization_id: value.organizationId,
        provider: value.provider,
        name: value.name,
        external_account_id: value.externalAccountId,
        is_active: value.isActive,
        last_synced_at: value.lastSyncedAt,
      })
      .select()
      .single();
    return mapIntegrationSource(requireData(data, error));
  }

  async listDocuments(
    organizationId: string,
    projectId?: string,
  ): Promise<readonly Document[]> {
    let query = this.client
      .from("documents")
      .select("*")
      .eq("organization_id", organizationId);
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query.order("document_date", {
      ascending: false,
      nullsFirst: false,
    });
    return requireData(data, error).map(mapDocument);
  }

  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const value = createDocumentSchema.parse(input);
    const { data, error } = await this.client
      .from("documents")
      .insert({
        organization_id: value.organizationId,
        project_id: value.projectId,
        vendor_id: value.vendorId,
        integration_source_id: value.integrationSourceId,
        name: value.name,
        document_type: value.documentType,
        storage_path: value.storagePath,
        original_filename: value.originalFilename,
        mime_type: value.mimeType,
        size_bytes: value.sizeBytes,
        processing_status: value.processingStatus,
        archived_at: value.archivedAt,
        external_id: value.externalId,
        document_date: value.documentDate,
      })
      .select()
      .single();
    return mapDocument(requireData(data, error));
  }

  async listRisks(filters: RiskQuery): Promise<readonly Risk[]> {
    let query = this.client
      .from("risks")
      .select("*")
      .eq("organization_id", filters.organizationId);
    if (filters.projectId) query = query.eq("project_id", filters.projectId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.detectedAfter)
      query = query.gte("detected_at", filters.detectedAfter);
    const { data, error } = await query
      .order("detected_at", { ascending: false })
      .limit(filters.limit ?? 100);
    return requireData(data, error).map(mapRisk);
  }

  async getRisk(organizationId: string, riskId: string): Promise<Risk | null> {
    const { data, error } = await this.client
      .from("risks")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", riskId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRisk(data) : null;
  }

  async createRisk(input: CreateRiskInput): Promise<Risk> {
    const value = createRiskSchema.parse(input);
    const { data, error } = await this.client
      .from("risks")
      .insert({
        organization_id: value.organizationId,
        project_id: value.projectId,
        vendor_id: value.vendorId,
        assigned_user_id: value.assignedUserId,
        detection_key: value.detectionKey,
        title: value.title,
        summary: value.summary,
        category: value.category,
        severity: value.severity,
        status: value.status,
        potential_exposure_cents: value.potentialExposureCents,
        estimated_margin_impact_cents: value.estimatedMarginImpactCents,
        confidence_score: value.confidenceScore,
        why_it_matters: value.whyItMatters,
        detected_at: value.detectedAt,
        due_at: value.dueAt,
        resolved_at: value.resolvedAt,
      })
      .select()
      .single();
    return mapRisk(requireData(data, error));
  }

  async updateRisk(
    organizationId: string,
    riskId: string,
    input: UpdateRiskInput,
  ): Promise<Risk> {
    const value = updateRiskSchema.parse(input);
    const patch: Database["public"]["Tables"]["risks"]["Update"] = {
      ...(value.projectId !== undefined ? { project_id: value.projectId } : {}),
      ...(value.vendorId !== undefined ? { vendor_id: value.vendorId } : {}),
      ...(value.assignedUserId !== undefined
        ? { assigned_user_id: value.assignedUserId }
        : {}),
      ...(value.detectionKey !== undefined
        ? { detection_key: value.detectionKey }
        : {}),
      ...(value.title !== undefined ? { title: value.title } : {}),
      ...(value.summary !== undefined ? { summary: value.summary } : {}),
      ...(value.category !== undefined ? { category: value.category } : {}),
      ...(value.severity !== undefined ? { severity: value.severity } : {}),
      ...(value.status !== undefined ? { status: value.status } : {}),
      ...(value.potentialExposureCents !== undefined
        ? { potential_exposure_cents: value.potentialExposureCents }
        : {}),
      ...(value.estimatedMarginImpactCents !== undefined
        ? { estimated_margin_impact_cents: value.estimatedMarginImpactCents }
        : {}),
      ...(value.confidenceScore !== undefined
        ? { confidence_score: value.confidenceScore }
        : {}),
      ...(value.whyItMatters !== undefined
        ? { why_it_matters: value.whyItMatters }
        : {}),
      ...(value.detectedAt !== undefined
        ? { detected_at: value.detectedAt }
        : {}),
      ...(value.dueAt !== undefined ? { due_at: value.dueAt } : {}),
      ...(value.resolvedAt !== undefined
        ? { resolved_at: value.resolvedAt }
        : {}),
    };
    const { data, error } = await this.client
      .from("risks")
      .update(patch)
      .eq("organization_id", organizationId)
      .eq("id", riskId)
      .select()
      .single();
    return mapRisk(requireData(data, error));
  }

  async addRiskEvidence(input: CreateRiskEvidenceInput): Promise<RiskEvidence> {
    const value = createRiskEvidenceSchema.parse(input);
    const { data, error } = await this.client
      .from("risk_evidence")
      .insert({
        organization_id: value.organizationId,
        risk_id: value.riskId,
        document_id: value.documentId,
        evidence_type: value.evidenceType,
        title: value.title,
        excerpt: value.excerpt,
        source_label: value.sourceLabel,
        source_location: value.sourceLocation,
        page_number: value.pageNumber,
        line_start: value.lineStart,
        line_end: value.lineEnd,
        occurred_at: value.occurredAt,
        relevance_score: value.relevanceScore,
        support_type: value.supportType,
        why_it_matters: value.whyItMatters,
      })
      .select()
      .single();
    return mapEvidence(requireData(data, error));
  }

  async addRecommendedAction(
    input: CreateRecommendedActionInput,
  ): Promise<RecommendedAction> {
    const value = createRecommendedActionSchema.parse(input);
    const { data, error } = await this.client
      .from("recommended_actions")
      .insert({
        organization_id: value.organizationId,
        risk_id: value.riskId,
        owner_user_id: value.ownerUserId,
        detection_key: value.detectionKey,
        title: value.title,
        description: value.description,
        action_type: value.actionType,
        status: value.status,
        priority: value.priority,
        due_at: value.dueAt,
        completed_at: value.completedAt,
        dismissed_at: value.dismissedAt,
        dismissal_reason: value.dismissalReason,
        created_by_user_id: value.createdBy,
        source: value.source,
      })
      .select()
      .single();
    return mapAction(requireData(data, error));
  }

  async addRiskActivity(input: CreateRiskActivityInput): Promise<RiskActivity> {
    const value = createRiskActivitySchema.parse(input);
    const { data, error } = await this.client
      .from("risk_activities")
      .insert({
        organization_id: value.organizationId,
        risk_id: value.riskId,
        actor_user_id: value.actorUserId,
        actor_type: value.actorType,
        activity_type: value.activityType,
        from_status: value.fromStatus,
        to_status: value.toStatus,
        summary: value.summary,
        mentioned_user_ids: value.mentionedUserIds,
        metadata: value.metadata,
        occurred_at: value.occurredAt,
      })
      .select()
      .single();
    return mapActivity(requireData(data, error));
  }

  async getDailyBrief(
    organizationId: string,
    briefDate: string,
  ): Promise<DailyBriefWithItems | null> {
    const { data: briefData, error: briefError } = await this.client
      .from("daily_briefs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("brief_date", briefDate)
      .maybeSingle();
    if (briefError) throw new Error(briefError.message);
    if (!briefData) return null;
    const { data: itemData, error: itemError } = await this.client
      .from("brief_items")
      .select("*")
      .eq("daily_brief_id", briefData.id)
      .order("priority");
    return {
      brief: mapBrief(briefData),
      items: requireData(itemData, itemError).map(mapBriefItem),
    };
  }

  async createDailyBrief(input: CreateDailyBriefInput): Promise<DailyBrief> {
    const value = createDailyBriefSchema.parse(input);
    const { data, error } = await this.client
      .from("daily_briefs")
      .insert({
        organization_id: value.organizationId,
        brief_date: value.briefDate,
        status: value.status,
        headline: value.headline,
        introduction: value.introduction,
        published_at: value.publishedAt,
      })
      .select()
      .single();
    return mapBrief(requireData(data, error));
  }

  async addBriefItem(input: CreateBriefItemInput): Promise<BriefItem> {
    const value = createBriefItemSchema.parse(input);
    const { data, error } = await this.client
      .from("brief_items")
      .insert({
        organization_id: value.organizationId,
        daily_brief_id: value.dailyBriefId,
        risk_id: value.riskId,
        priority: value.priority,
        headline: value.headline,
        summary: value.summary,
        recommended_next_step: value.recommendedNextStep,
      })
      .select()
      .single();
    return mapBriefItem(requireData(data, error));
  }

  async publishDailyBrief(
    organizationId: string,
    briefId: string,
    publishedAt: string,
  ): Promise<DailyBrief> {
    const { data, error } = await this.client
      .from("daily_briefs")
      .update({ status: "published", published_at: publishedAt })
      .eq("organization_id", organizationId)
      .eq("id", briefId)
      .select()
      .single();
    return mapBrief(requireData(data, error));
  }
}
