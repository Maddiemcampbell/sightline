import { describe,expect,it } from "vitest";
import { calculatePortfolioRiskAnalytics,calculateRiskAttention } from "@/features/risk-analytics/calculations";
import { normalizeRiskCategory } from "@/features/risk-analytics/taxonomy";
import type { AnalyticsRisk,RiskAnalyticsInput } from "@/features/risk-analytics/types";

const risk=(overrides:Partial<AnalyticsRisk>={}):AnalyticsRisk=>({
  id:"r1",organization_id:"o1",project_id:"p1",vendor_id:null,title:"Late steel",
  summary:"Steel delivery is late",category:"schedule",severity:"high",status:"action_needed",
  potential_exposure_cents:500_000,estimated_margin_impact_cents:0,confidence_score:88,
  why_it_matters:"May delay completion",detected_at:"2026-07-20T00:00:00Z",due_at:null,
  resolved_at:null,created_at:"2026-07-20T00:00:00Z",updated_at:"2026-07-20T00:00:00Z",
  assigned_user_id:null,detection_key:null,updated_by_user_id:null,...overrides,
});
const input=(risks:AnalyticsRisk[],extra:Partial<RiskAnalyticsInput>={}):RiskAnalyticsInput=>({
  now:new Date("2026-07-25T12:00:00Z"),projects:[{id:"p1",organization_id:"o1",name:"Atlas",
    project_number:"A",status:"active",address_line_1:null,city:null,state_code:null,postal_code:null,
    contract_value_cents:null,projected_margin_cents:0,start_date:null,target_completion_date:null,created_at:"",updated_at:"",
    updated_by_user_id:null}],risks,actions:[],evidence:[],canViewFinancials:true,...extra,
});

describe("portfolio risk analytics",()=>{
  it("preserves source categories and supports a versioned manual override",()=>{
    expect(normalizeRiskCategory(risk()).normalizedCategory).toBe("schedule");
    expect(normalizeRiskCategory(risk({normalized_category_id:"quality",category_mapping_confidence:97})))
      .toMatchObject({originalCategory:"schedule",normalizedCategory:"quality",source:"manual",confidence:97});
  });
  it("uses explainable deterministic attention factors",()=>{
    expect(calculateRiskAttention(risk(),{overdue:true,actionCount:0,evidenceCount:0}))
      .toMatchObject({score:107,reasons:expect.arrayContaining(["has no owner (+8)"])});
  });
  it("does not turn unassessed exposure or missing probability into zero",()=>{
    const output=calculatePortfolioRiskAnalytics(input([risk()]));
    expect(output.summary.assessedExposureCents).toBeNull();
    expect(output.summary.expectedExposureCents).toBeNull();
    expect(output.metadata.quality).toBe("not_assessed");
  });
  it("aggregates explicitly assessed exposure and explains heatmap cells",()=>{
    const output=calculatePortfolioRiskAnalytics(input([risk({financial_exposure_assessed:true})]));
    expect(output.summary.assessedExposureCents).toBe(500_000);
    expect(output.drivers[0]).toMatchObject({activeRiskCount:1,affectedProjectCount:1});
    expect(output.heatmap[0]?.cells[0]?.explanation).toContain("highest severity high");
  });
  it("applies project and category filters before aggregation",()=>{
    const output=calculatePortfolioRiskAnalytics(input([risk(),risk({id:"r2",category:"financial"})],{
      filters:{categories:["financial"]},
    }));
    expect(output.summary.activeRisks).toBe(1);
    expect(output.drivers[0]?.category).toBe("financial");
  });
  it("uses stable title ordering when attention scores tie",()=>{
    const output=calculatePortfolioRiskAnalytics(input([risk({id:"b",title:"Zulu"}),risk({id:"a",title:"Alpha"})]));
    expect(output.executiveRisks.map(item=>item.title)).toEqual(["Alpha","Zulu"]);
  });
  it("compares driver counts with a durable prior snapshot",()=>{
    const baseline=calculatePortfolioRiskAnalytics(input([risk()]));
    const output=calculatePortfolioRiskAnalytics(input([risk(),risk({id:"r2"})],{priorSnapshot:baseline}));
    expect(output.drivers[0]).toMatchObject({trendPercent:100,trendState:"worsening"});
  });
});
