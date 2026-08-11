import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class EmailDraftRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async contextForRisk(
    context: ActorContext,
    riskId: string,
    actionId: string | null,
  ) {
    const { data: risk, error } = await this.client
      .from("risks")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!risk) throw new Error("Risk not found.");
    const [project, vendor, evidence, actions, users] = await Promise.all([
      risk.project_id
        ? this.client
            .from("projects")
            .select("id,name")
            .eq("organization_id", context.organizationId)
            .eq("id", risk.project_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      risk.vendor_id
        ? this.client
            .from("vendors")
            .select("id,name,contact_name,contact_email")
            .eq("organization_id", context.organizationId)
            .eq("id", risk.vendor_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      this.client
        .from("risk_evidence")
        .select("id,title,excerpt,why_it_matters,created_at")
        .eq("organization_id", context.organizationId)
        .eq("risk_id", riskId)
        .order("relevance_score", { ascending: false })
        .limit(20),
      this.client
        .from("recommended_actions")
        .select("id,title,description,due_at")
        .eq("organization_id", context.organizationId)
        .eq("risk_id", riskId)
        .order("created_at"),
      this.client
        .from("users")
        .select("id,full_name,email,title,role")
        .eq("organization_id", context.organizationId)
        .order("full_name"),
    ]);
    for (const result of [project, vendor, evidence, actions, users])
      if (result.error) throw new Error(result.error.message);
    const action = actionId
      ? (actions.data ?? []).find((item) => item.id === actionId)
      : (actions.data ?? [])[0];
    if (actionId && !action) throw new Error("Recommended action not found.");
    return {
      risk,
      project: project.data,
      vendor: vendor.data,
      evidence: evidence.data ?? [],
      action: action ?? null,
      users: users.data ?? [],
    };
  }

  async get(context: ActorContext, draftId: string) {
    const { data, error } = await this.client
      .from("risk_email_drafts")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", draftId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Email draft not found.");
    return data;
  }

  async insert(
    context: ActorContext,
    values: AppDatabase["public"]["Tables"]["risk_email_drafts"]["Insert"],
  ) {
    if (values.organization_id !== context.organizationId) {
      throw new Error("Organization access denied.");
    }
    const { data, error } = await this.client
      .from("risk_email_drafts")
      .insert(values)
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Email draft was not saved.");
    return data;
  }

  async update(
    context: ActorContext,
    draftId: string,
    values: AppDatabase["public"]["Tables"]["risk_email_drafts"]["Update"],
  ) {
    const { data, error } = await this.client
      .from("risk_email_drafts")
      .update(values)
      .eq("organization_id", context.organizationId)
      .eq("id", draftId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Email draft not found.");
    return data;
  }
}
