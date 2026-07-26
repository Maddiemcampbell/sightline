import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { ActorContext } from "@/lib/auth/authorization";

export class RiskAnalyticsRepository {
  constructor(private readonly client:SupabaseClient<AppDatabase>){}
  async load(context:ActorContext, projectId?:string|null){
    const projectsQuery=this.client.from("projects").select("*").eq("organization_id",context.organizationId);
    const risksQuery=this.client.from("risks").select("*").eq("organization_id",context.organizationId);
    const [projects,risks,actions,evidence,vendors,snapshot]=await Promise.all([
      projectId?projectsQuery.eq("id",projectId):projectsQuery,
      projectId?risksQuery.eq("project_id",projectId):risksQuery,
      this.client.from("recommended_actions").select("*").eq("organization_id",context.organizationId),
      this.client.from("risk_evidence").select("risk_id").eq("organization_id",context.organizationId),
      this.client.from("vendors").select("*").eq("organization_id",context.organizationId),
      this.client.from("portfolio_risk_snapshots").select("analytics_payload")
        .eq("organization_id",context.organizationId).order("snapshot_month",{ascending:false}).limit(1).maybeSingle(),
    ]);
    for(const result of [projects,risks,actions,evidence,vendors,snapshot]) if(result.error) throw new Error(result.error.message);
    return {projects:projects.data??[],risks:risks.data??[],actions:actions.data??[],evidence:evidence.data??[],vendors:vendors.data??[],
      priorSnapshot:(snapshot.data?.analytics_payload??null) as unknown as import("@/features/risk-analytics/types").RiskAnalyticsOutput|null};
  }
}
