import { z } from "zod";

import {
  RISK_CATEGORIES,
  RISK_SEVERITIES,
  RISK_STATUSES,
} from "@/domain/types";

const idSchema = z.uuid();
const nullableIdSchema = idSchema.nullable();
const timestampSchema = z.iso.datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const dateSchema = z.iso.date();
const nullableDateSchema = dateSchema.nullable();
const moneySchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).nullable();

function nonEmptyUpdate<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema
    .partial()
    .strict()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required",
    );
}

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    timezone: z.string().trim().min(1).max(100).default("America/Los_Angeles"),
  })
  .strict();
export const updateOrganizationSchema = nonEmptyUpdate(
  createOrganizationSchema,
);

export const createUserSchema = z
  .object({
    organizationId: idSchema,
    authUserId: nullableIdSchema.default(null),
    email: z.email(),
    fullName: z.string().trim().min(1).max(160),
    title: optionalText(160).default(null),
    role: z
      .enum(["executive", "operations", "project_manager", "admin"])
      .default("operations"),
    emailDeliveryEnabled: z.boolean().default(true),
    preferredDeliveryTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default("07:00"),
    deliveryTimezone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default("America/Los_Angeles"),
  })
  .strict();
export const updateUserSchema = nonEmptyUpdate(
  createUserSchema.omit({ organizationId: true }),
);

export const createProjectSchema = z
  .object({
    organizationId: idSchema,
    name: z.string().trim().min(1).max(200),
    projectNumber: z.string().trim().min(1).max(80),
    status: z
      .enum(["planning", "active", "on_hold", "complete", "cancelled"])
      .default("active"),
    addressLine1: optionalText(240).default(null),
    city: optionalText(120).default(null),
    stateCode: z.string().length(2).toUpperCase().nullable().default(null),
    postalCode: optionalText(20).default(null),
    contractValueCents: moneySchema.nullable().default(null),
    projectedMarginCents: moneySchema.default(0),
    startDate: nullableDateSchema.default(null),
    targetCompletionDate: nullableDateSchema.default(null),
  })
  .strict();
export const updateProjectSchema = nonEmptyUpdate(
  createProjectSchema.omit({ organizationId: true }),
);

export const createVendorSchema = z
  .object({
    organizationId: idSchema,
    name: z.string().trim().min(1).max(200),
    trade: optionalText(160).default(null),
    contactName: optionalText(160).default(null),
    contactEmail: z.email().nullable().default(null),
  })
  .strict();
export const updateVendorSchema = nonEmptyUpdate(
  createVendorSchema.omit({ organizationId: true }),
);

export const createIntegrationSourceSchema = z
  .object({
    organizationId: idSchema,
    provider: z
      .enum(["manual", "procore", "autodesk", "email", "sharepoint", "other"])
      .default("manual"),
    name: z.string().trim().min(1).max(160),
    externalAccountId: optionalText(240).default(null),
    isActive: z.boolean().default(true),
    lastSyncedAt: nullableTimestampSchema.default(null),
  })
  .strict();
export const updateIntegrationSourceSchema = nonEmptyUpdate(
  createIntegrationSourceSchema.omit({ organizationId: true }),
);

export const createDocumentSchema = z
  .object({
    organizationId: idSchema,
    projectId: nullableIdSchema.default(null),
    vendorId: nullableIdSchema.default(null),
    integrationSourceId: nullableIdSchema.default(null),
    name: z.string().trim().min(1).max(240),
    documentType: z
      .enum([
        "contract",
        "insurance",
        "daily_log",
        "rfi",
        "schedule",
        "change_order",
        "incident_report",
        "safety",
        "financial",
        "other",
      ])
      .default("other"),
    storagePath: optionalText(1000).default(null),
    originalFilename: optionalText(240).default(null),
    mimeType: optionalText(160).default(null),
    sizeBytes: moneySchema.nullable().default(null),
    processingStatus: z.enum(["pending", "ready", "failed"]).default("pending"),
    archivedAt: nullableTimestampSchema.default(null),
    externalId: optionalText(240).default(null),
    documentDate: nullableDateSchema.default(null),
  })
  .strict();
export const updateDocumentSchema = nonEmptyUpdate(
  createDocumentSchema.omit({ organizationId: true }),
);

export const createRiskSchema = z
  .object({
    organizationId: idSchema,
    projectId: nullableIdSchema.default(null),
    vendorId: nullableIdSchema.default(null),
    assignedUserId: nullableIdSchema.default(null),
    detectionKey: optionalText(240).default(null),
    title: z.string().trim().min(1).max(240),
    summary: z.string().trim().min(1).max(2000),
    category: z.enum(RISK_CATEGORIES),
    severity: z.enum(RISK_SEVERITIES),
    status: z.enum(RISK_STATUSES).default("monitoring"),
    potentialExposureCents: moneySchema.default(0),
    estimatedMarginImpactCents: moneySchema.default(0),
    confidenceScore: z.number().int().min(0).max(100),
    whyItMatters: z.string().trim().min(1).max(3000),
    detectedAt: timestampSchema,
    dueAt: nullableTimestampSchema.default(null),
    resolvedAt: nullableTimestampSchema.default(null),
  })
  .strict()
  .superRefine((risk, context) => {
    if (risk.status === "resolved" && risk.resolvedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["resolvedAt"],
        message: "Resolved risks require resolvedAt",
      });
    }
    if (
      risk.resolvedAt !== null &&
      new Date(risk.resolvedAt) < new Date(risk.detectedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["resolvedAt"],
        message: "resolvedAt cannot precede detectedAt",
      });
    }
  });

const updateRiskFieldsSchema = z.object({
  projectId: nullableIdSchema,
  vendorId: nullableIdSchema,
  assignedUserId: nullableIdSchema,
  detectionKey: optionalText(240),
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().min(1).max(2000),
  category: z.enum(RISK_CATEGORIES),
  severity: z.enum(RISK_SEVERITIES),
  status: z.enum(RISK_STATUSES),
  potentialExposureCents: moneySchema,
  estimatedMarginImpactCents: moneySchema,
  confidenceScore: z.number().int().min(0).max(100),
  whyItMatters: z.string().trim().min(1).max(3000),
  detectedAt: timestampSchema,
  dueAt: nullableTimestampSchema,
  resolvedAt: nullableTimestampSchema,
});
export const updateRiskSchema = nonEmptyUpdate(
  updateRiskFieldsSchema,
).superRefine((risk, context) => {
  if (risk.status === "resolved" && !risk.resolvedAt) {
    context.addIssue({
      code: "custom",
      path: ["resolvedAt"],
      message: "Changing status to resolved requires resolvedAt",
    });
  }
});

export const createRiskEvidenceSchema = z
  .object({
    organizationId: idSchema,
    riskId: idSchema,
    documentId: nullableIdSchema.default(null),
    detectionKey: optionalText(240).default(null),
    integrationSourceId: nullableIdSchema.default(null),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(3000),
    sourceExcerpt: optionalText(5000).default(null),
    observedAt: timestampSchema,
  })
  .strict();
export const updateRiskEvidenceSchema = nonEmptyUpdate(
  createRiskEvidenceSchema.omit({ organizationId: true, riskId: true }),
);

const recommendedActionFieldsSchema = z.object({
  assignedUserId: nullableIdSchema.default(null),
  detectionKey: optionalText(240).default(null),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().min(1).max(2000),
  status: z
    .enum(["open", "in_progress", "complete", "dismissed"])
    .default("open"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueAt: nullableTimestampSchema.default(null),
  completedAt: nullableTimestampSchema.default(null),
});

export const createRecommendedActionSchema = recommendedActionFieldsSchema
  .extend({ organizationId: idSchema, riskId: idSchema })
  .strict()
  .superRefine((action, context) => {
    if (action.status === "complete" && action.completedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "Completed actions require completedAt",
      });
    }
  });
export const updateRecommendedActionSchema = nonEmptyUpdate(
  recommendedActionFieldsSchema,
);

export const createRiskResolutionSchema = z
  .object({
    organizationId: idSchema,
    riskId: idSchema,
    resolvedByUserId: idSchema,
    resolutionType: z.enum([
      "mitigated",
      "avoided",
      "accepted",
      "realized",
      "unknown",
    ]),
    summary: z.string().trim().min(3).max(3000),
    realizedImpactCents: moneySchema.nullable().default(null),
    resolvedAt: timestampSchema,
  })
  .strict();

const dailyBriefFieldsSchema = z.object({
  status: z.enum(["draft", "published"]).default("draft"),
  headline: z.string().trim().min(1).max(240),
  introduction: z.string().trim().min(1).max(2000),
  publishedAt: nullableTimestampSchema.default(null),
});

export const createDailyBriefSchema = dailyBriefFieldsSchema
  .extend({ organizationId: idSchema, briefDate: dateSchema })
  .strict()
  .superRefine((brief, context) => {
    if (brief.status === "published" && brief.publishedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Published briefs require publishedAt",
      });
    }
  });
export const updateDailyBriefSchema = nonEmptyUpdate(dailyBriefFieldsSchema);

export const createBriefItemSchema = z
  .object({
    organizationId: idSchema,
    dailyBriefId: idSchema,
    riskId: idSchema,
    priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    headline: z.string().trim().min(1).max(240),
    summary: z.string().trim().min(1).max(2000),
    recommendedNextStep: z.string().trim().min(1).max(1000),
  })
  .strict();
export const updateBriefItemSchema = nonEmptyUpdate(
  createBriefItemSchema.omit({
    organizationId: true,
    dailyBriefId: true,
    riskId: true,
  }),
);

export const createRiskActivitySchema = z
  .object({
    organizationId: idSchema,
    riskId: idSchema,
    actorUserId: nullableIdSchema.default(null),
    activityType: z.enum([
      "created",
      "status_changed",
      "assigned",
      "commented",
      "evidence_added",
      "action_updated",
      "resolved",
      "dismissed",
    ]),
    fromStatus: z.enum(RISK_STATUSES).nullable().default(null),
    toStatus: z.enum(RISK_STATUSES).nullable().default(null),
    note: optionalText(3000).default(null),
    metadata: z.record(z.string(), z.json()).default({}),
    occurredAt: timestampSchema,
  })
  .strict()
  .superRefine((activity, context) => {
    if (
      activity.activityType === "status_changed" &&
      (activity.fromStatus === null ||
        activity.toStatus === null ||
        activity.fromStatus === activity.toStatus)
    ) {
      context.addIssue({
        code: "custom",
        path: ["toStatus"],
        message:
          "Status changes require distinct fromStatus and toStatus values",
      });
    }
  });
export const updateRiskActivitySchema = nonEmptyUpdate(
  z.object({
    note: optionalText(3000),
    metadata: z.record(z.string(), z.json()),
  }),
);

export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type CreateVendorInput = z.input<typeof createVendorSchema>;
export type UpdateVendorInput = z.input<typeof updateVendorSchema>;
export type CreateIntegrationSourceInput = z.input<
  typeof createIntegrationSourceSchema
>;
export type UpdateIntegrationSourceInput = z.input<
  typeof updateIntegrationSourceSchema
>;
export type CreateDocumentInput = z.input<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.input<typeof updateDocumentSchema>;
export type CreateRiskInput = z.input<typeof createRiskSchema>;
export type UpdateRiskInput = z.input<typeof updateRiskSchema>;
export type CreateRiskEvidenceInput = z.input<typeof createRiskEvidenceSchema>;
export type UpdateRiskEvidenceInput = z.input<typeof updateRiskEvidenceSchema>;
export type CreateRecommendedActionInput = z.input<
  typeof createRecommendedActionSchema
>;
export type UpdateRecommendedActionInput = z.input<
  typeof updateRecommendedActionSchema
>;
export type CreateDailyBriefInput = z.input<typeof createDailyBriefSchema>;
export type UpdateDailyBriefInput = z.input<typeof updateDailyBriefSchema>;
export type CreateBriefItemInput = z.input<typeof createBriefItemSchema>;
export type UpdateBriefItemInput = z.input<typeof updateBriefItemSchema>;
export type CreateRiskActivityInput = z.input<typeof createRiskActivitySchema>;
export type UpdateRiskActivityInput = z.input<typeof updateRiskActivitySchema>;
