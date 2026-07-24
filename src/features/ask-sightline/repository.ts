import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ASK_HISTORY_LIMIT } from "@/domain/ai/risk-question";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class AskSightlineRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async requireRisk(context: ActorContext, riskId: string) {
    const { data, error } = await this.client
      .from("risks")
      .select(
        "id,title,summary,severity,status,due_at,project_id,vendor_id,category",
      )
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Risk not found.");
    return data;
  }

  async retrieve(context: ActorContext, riskId: string, question: string) {
    const risk = await this.requireRisk(context, riskId);
    const terms = question.toLowerCase();
    const needsActions = /next|do|action|mitigat|recommend/.test(terms);
    const needsHistory = /similar|before|history|happened|activity|change/.test(
      terms,
    );
    const [project, vendor, evidence, actions, activity, historical] =
      await Promise.all([
        risk.project_id
          ? this.client
              .from("projects")
              .select("name,project_number,status")
              .eq("organization_id", context.organizationId)
              .eq("id", risk.project_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        risk.vendor_id
          ? this.client
              .from("vendors")
              .select("name,trade")
              .eq("organization_id", context.organizationId)
              .eq("id", risk.vendor_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        this.client
          .from("risk_evidence")
          .select(
            "id,title,excerpt,why_it_matters,evidence_type,relevance_score,document_id",
          )
          .eq("organization_id", context.organizationId)
          .eq("risk_id", riskId)
          .order("relevance_score", { ascending: false })
          .limit(8),
        needsActions
          ? this.client
              .from("recommended_actions")
              .select("title,description,status,due_at")
              .eq("organization_id", context.organizationId)
              .eq("risk_id", riskId)
              .order("created_at")
              .limit(5)
          : Promise.resolve({ data: [], error: null }),
        needsHistory
          ? this.client
              .from("risk_activities")
              .select("summary,occurred_at")
              .eq("organization_id", context.organizationId)
              .eq("risk_id", riskId)
              .order("occurred_at", { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [], error: null }),
        needsHistory
          ? this.client
              .from("risks")
              .select("title,status")
              .eq("organization_id", context.organizationId)
              .eq("category", risk.category)
              .neq("id", riskId)
              .limit(5)
          : Promise.resolve({ data: [], error: null }),
      ]);
    for (const result of [
      project,
      vendor,
      evidence,
      actions,
      activity,
      historical,
    ])
      if (result.error) throw new Error(result.error.message);
    const documentIds = [
      ...new Set(
        (evidence.data ?? []).flatMap((item) =>
          item.document_id ? [item.document_id] : [],
        ),
      ),
    ];
    const documents =
      documentIds.length &&
      /contract|document|insurance|evidence|source/.test(terms)
        ? await this.client
            .from("documents")
            .select("id,name,document_type,document_date")
            .eq("organization_id", context.organizationId)
            .in("id", documentIds)
        : { data: [], error: null };
    if (documents.error) throw new Error(documents.error.message);
    return {
      risk,
      project: project.data,
      vendor: vendor.data,
      evidence: evidence.data ?? [],
      documents: documents.data ?? [],
      actions: actions.data ?? [],
      activity: activity.data ?? [],
      historical: historical.data ?? [],
    };
  }

  async conversation(context: ActorContext, riskId: string) {
    await this.requireRisk(context, riskId);
    const { data, error } = await this.client
      .from("risk_conversations")
      .upsert(
        {
          organization_id: context.organizationId,
          risk_id: riskId,
          user_id: context.userId,
        },
        { onConflict: "organization_id,risk_id,user_id" },
      )
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Conversation could not be opened.");
    return data;
  }

  async history(context: ActorContext, riskId: string) {
    const conversation = await this.conversation(context, riskId);
    const { data, error } = await this.client
      .from("risk_conversation_messages")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(ASK_HISTORY_LIMIT);
    if (error) throw new Error(error.message);
    return { conversation, messages: (data ?? []).reverse() };
  }

  async append(
    context: ActorContext,
    values: AppDatabase["public"]["Tables"]["risk_conversation_messages"]["Insert"],
  ) {
    if (values.organization_id !== context.organizationId) {
      throw new Error("Organization access denied.");
    }
    const { data, error } = await this.client
      .from("risk_conversation_messages")
      .insert(values)
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Message could not be stored.");
    return data;
  }

  async prune(context: ActorContext, conversationId: string) {
    const { data, error } = await this.client
      .from("risk_conversation_messages")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(ASK_HISTORY_LIMIT, 999);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((item) => item.id);
    if (!ids.length) return;
    const removed = await this.client
      .from("risk_conversation_messages")
      .delete()
      .eq("organization_id", context.organizationId)
      .eq("conversation_id", conversationId)
      .in("id", ids);
    if (removed.error) throw new Error(removed.error.message);
  }

  async feedback(
    context: ActorContext,
    messageId: string,
    rating: "helpful" | "not_helpful" | "incorrect",
  ) {
    const { data: message, error } = await this.client
      .from("risk_conversation_messages")
      .select("id,conversation_id,role")
      .eq("organization_id", context.organizationId)
      .eq("id", messageId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!message || message.role !== "assistant")
      throw new Error("Answer not found.");
    const { data: conversation } = await this.client
      .from("risk_conversations")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .eq("id", message.conversation_id)
      .maybeSingle();
    if (!conversation) throw new Error("Answer not found.");
    const result = await this.client.from("risk_answer_feedback").upsert(
      {
        organization_id: context.organizationId,
        message_id: messageId,
        user_id: context.userId,
        rating,
      },
      { onConflict: "message_id,user_id" },
    );
    if (result.error) throw new Error(result.error.message);
  }
}
