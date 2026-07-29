import "server-only";
import { calculatePortfolioRiskAnalytics } from "@/features/risk-analytics/calculations";
import {
  RISK_ANALYTICS_VERSION,
  RISK_RANKING_VERSION,
  RISK_TAXONOMY_VERSION,
} from "@/features/risk-analytics/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { collectAllRows } from "@/lib/supabase/pagination";

export class RiskSnapshotService {
  async createMonthlySnapshot(organizationId:string,now=new Date()){
    const client=createAdminSupabaseClient();
    const [projects,risks,actions,evidence]=await Promise.all([
      client.from("projects").select("*").eq("organization_id",organizationId),
      collectAllRows((from,to) => client.from("risks").select("*",{count:"exact"}).eq("organization_id",organizationId).order("id").range(from,to)),
      client.from("recommended_actions").select("*").eq("organization_id",organizationId),
      client.from("risk_evidence").select("risk_id").eq("organization_id",organizationId),
    ]);
    for(const result of [projects,actions,evidence]) if(result.error) throw new Error(result.error.message);
    const analytics=calculatePortfolioRiskAnalytics({now,projects:projects.data??[],risks,
      actions:actions.data??[],evidence:evidence.data??[],canViewFinancials:true});
    const snapshotMonth=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-01`;
    const {data,error}=await client.from("portfolio_risk_snapshots").upsert({
      organization_id:organizationId,snapshot_month:snapshotMonth,
      analytics_payload:analytics as unknown as Json,calculation_version:RISK_ANALYTICS_VERSION,
      taxonomy_version:RISK_TAXONOMY_VERSION,ranking_version:RISK_RANKING_VERSION,
      data_quality:analytics.metadata.quality,calculated_at:now.toISOString(),
    },{onConflict:"organization_id,snapshot_month"}).select("id,snapshot_month,data_quality").single();
    if(error) throw new Error(error.message);
    return data;
  }
}
