"use server";

import { revalidatePath } from "next/cache";
import { recordAuditEvent } from "@/features/audit/service";
import {
  notificationSettingsSchema,
  organizationNotificationDefaultsSchema,
  organizationSettingsSchema,
  passwordUpdateSchema,
  profileSettingsSchema,
  projectDefaultsSchema,
} from "@/features/settings/validation";
import {
  assertAuthorized,
  canManageOrganization,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export type SettingsActionState = { message: string; error?: string };

export async function updateProfileAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = profileSettingsSchema.safeParse({
    fullName: formData.get("fullName"),
    title: formData.get("title"),
  });
  if (!parsed.success)
    return {
      message: "",
      error: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  const context = await requireActorContext();
  const { error } = await createAdminSupabaseClient()
    .from("users")
    .update({
      full_name: parsed.data.fullName,
      title: parsed.data.title || null,
    })
    .eq("organization_id", context.organizationId)
    .eq("id", context.userId);
  if (error) return { message: "", error: error.message };
  await audit(context, "profile");
  revalidatePath("/settings/profile");
  return { message: "Profile saved." };
}

export async function updateOrganizationSettingsAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    brandColor: formData.get("brandColor"),
    timezone: formData.get("timezone"),
    defaultCurrency: formData.get("defaultCurrency"),
    industry: formData.get("industry"),
    companySize: formData.get("companySize"),
  });
  if (!parsed.success)
    return {
      message: "",
      error: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  const context = await requireActorContext();
  assertAuthorized(canManageOrganization(context));
  const { error } = await createAdminSupabaseClient()
    .from("organizations")
    .update({
      name: parsed.data.name,
      logo_url: parsed.data.logoUrl || null,
      brand_color: parsed.data.brandColor.toUpperCase(),
      timezone: parsed.data.timezone,
      default_currency: parsed.data.defaultCurrency,
      industry: parsed.data.industry || null,
      company_size: parsed.data.companySize || null,
    })
    .eq("id", context.organizationId);
  if (error) return { message: "", error: error.message };
  await audit(context, "organization");
  revalidatePath("/settings", "layout");
  return { message: "Organization settings saved." };
}

export async function updateNotificationSettingsAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = notificationSettingsSchema.safeParse({
    digestFrequency: formData.get("digestFrequency"),
    assignmentNotifications: formData.get("assignmentNotifications") === "on",
    mentionNotifications: formData.get("mentionNotifications") === "on",
    weeklySummary: formData.get("weeklySummary") === "on",
  });
  if (!parsed.success)
    return {
      message: "",
      error: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  const context = await requireActorContext();
  const { error } = await createAdminSupabaseClient()
    .from("users")
    .update({
      digest_frequency: parsed.data.digestFrequency,
      assignment_notifications_enabled: parsed.data.assignmentNotifications,
      mention_notifications_enabled: parsed.data.mentionNotifications,
      weekly_summary_enabled: parsed.data.weeklySummary,
    })
    .eq("organization_id", context.organizationId)
    .eq("id", context.userId);
  if (error) return { message: "", error: error.message };
  await audit(context, "notification_preferences");
  revalidatePath("/settings/notifications");
  return { message: "Notification preferences saved." };
}

export async function updateOrganizationNotificationDefaultsAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = organizationNotificationDefaultsSchema.safeParse({
    digest: formData.get("digest"),
    assignment: formData.get("assignment") === "on",
    mention: formData.get("mention") === "on",
    weeklySummary: formData.get("weeklySummary") === "on",
  });
  if (!parsed.success)
    return {
      message: "",
      error: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  const context = await requireActorContext();
  assertAuthorized(canManageOrganization(context));
  const { error } = await createAdminSupabaseClient()
    .from("organizations")
    .update({
      notification_defaults: parsed.data,
    })
    .eq("id", context.organizationId);
  if (error) return { message: "", error: error.message };
  await audit(context, "organization_notification_defaults");
  revalidatePath("/settings/notifications");
  return { message: "Organization notification defaults saved." };
}

export async function updateProjectDefaultsAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = projectDefaultsSchema.safeParse({
    visibility: formData.get("visibility"),
    role: formData.get("role"),
    documentPermissions: formData.get("documentPermissions"),
  });
  if (!parsed.success)
    return {
      message: "",
      error: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  const context = await requireActorContext();
  assertAuthorized(canManageOrganization(context));
  const { error } = await createAdminSupabaseClient()
    .from("organizations")
    .update({
      default_project_visibility: parsed.data.visibility,
      default_project_role: parsed.data.role,
      default_document_permissions: parsed.data.documentPermissions,
    })
    .eq("id", context.organizationId);
  if (error) return { message: "", error: error.message };
  await audit(context, "project_defaults");
  revalidatePath("/settings/projects");
  return { message: "Project defaults saved." };
}

export async function updatePasswordAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success)
    return {
      message: "",
      error: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { message: "", error: error.message };
  const context = await requireActorContext();
  await audit(context, "password");
  return { message: "Password updated." };
}

export async function terminateOtherSessionsAction() {
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.signOut({ scope: "others" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/security");
}

async function audit(
  context: Awaited<ReturnType<typeof requireActorContext>>,
  resourceType: string,
) {
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "settings.updated",
    resourceType,
    resourceId: context.userId,
    metadata: { source: "settings" },
  });
}
