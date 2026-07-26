import { categoryLabel, normalizeRiskCategory, riskTaxonomy } from "@/features/risk-analytics/taxonomy";
import {
  RISK_ANALYTICS_VERSION, RISK_RANKING_VERSION, RISK_TAXONOMY_VERSION,
  type AnalyticsRisk, type DataState, type RiskAnalyticsInput, type RiskAnalyticsOutput,
  type Severity,
} from "@/features/risk-analytics/types";

const terminal = new Set(["resolved","dismissed"]);
const severityValue: Record<Severity,number> = { low:25, medium:50, high:75, critical:100 };
const quality=(missing:number,total:number):DataState =>
  total===0?"unavailable":missing===0?"complete":missing===total?"not_assessed":"partial";

export function calculateRiskAttention(risk: AnalyticsRisk, facts: {
  overdue:boolean; actionCount:number; evidenceCount:number;
}) {
  let score=severityValue[risk.severity];
  const reasons=[`${risk.severity} severity (${severityValue[risk.severity]} ordinal points)`];
  if (facts.overdue){score+=12; reasons.push("has an overdue mitigation action (+12)");}
  if (!risk.assigned_user_id){score+=8; reasons.push("has no owner (+8)");}
  if (!facts.actionCount){score+=7; reasons.push("has no mitigation action (+7)");}
  if (!facts.evidenceCount){score+=5; reasons.push("has no linked evidence (+5)");}
  return { score:Math.min(132,score), reasons, version:RISK_RANKING_VERSION };
}

export function calculatePortfolioRiskAnalytics(input:RiskAnalyticsInput):RiskAnalyticsOutput {
  const at=input.now.toISOString(), start=Date.parse(input.filters?.periodStart ?? new Date(input.now.getFullYear(),input.now.getMonth(),1).toISOString());
  const end=Date.parse(input.filters?.periodEnd ?? at);
  const projects=input.projects.filter(p=>
    (!input.filters?.projectIds?.length||input.filters.projectIds.includes(p.id))&&
    (!input.filters?.projectStatuses?.length||input.filters.projectStatuses.includes(p.status)));
  const projectIds=new Set(projects.map(p=>p.id));
  const risks=input.risks.filter(r=>
    (!r.project_id||projectIds.has(r.project_id))&&
    (!input.filters?.severities?.length||input.filters.severities.includes(r.severity))&&
    (!input.filters?.statuses?.length||input.filters.statuses.includes(r.status))&&
    (!input.filters?.ownerIds?.length||(r.assigned_user_id&&input.filters.ownerIds.includes(r.assigned_user_id)))&&
    (!input.filters?.vendorIds?.length||(r.vendor_id&&input.filters.vendorIds.includes(r.vendor_id)))&&
    (!input.filters?.categories?.length||input.filters.categories.includes(normalizeRiskCategory(r).normalizedCategory)));
  const evidenceCount=new Map<string,number>(), actionsByRisk=new Map<string,typeof input.actions>();
  input.evidence.forEach(e=>evidenceCount.set(e.risk_id,(evidenceCount.get(e.risk_id)??0)+1));
  input.actions.forEach(a=>actionsByRisk.set(a.risk_id,[...(actionsByRisk.get(a.risk_id)??[]),a]));
  const active=risks.filter(r=>!terminal.has(r.status));
  const facts=new Map(active.map(r=>{
    const actions=actionsByRisk.get(r.id)??[];
    const overdue=actions.some(a=>!["completed","dismissed"].includes(a.status)&&!!a.due_at&&Date.parse(a.due_at)<input.now.getTime());
    return [r.id,{ mapping:normalizeRiskCategory(r), actions, overdue, evidence:evidenceCount.get(r.id)??0,
      attention:calculateRiskAttention(r,{overdue,actionCount:actions.length,evidenceCount:evidenceCount.get(r.id)??0}) }];
  }));
  const categories=riskTaxonomy.filter(c=>active.some(r=>facts.get(r.id)?.mapping.normalizedCategory===c.id));
  const exposureOf=(r:AnalyticsRisk)=>input.canViewFinancials&&r.financial_exposure_assessed===true?r.potential_exposure_cents:null;
  const drivers=categories.map(c=>{
    const rows=active.filter(r=>facts.get(r.id)?.mapping.normalizedCategory===c.id);
    const assessed=rows.map(exposureOf).filter((v):v is number=>v!==null);
    const missing=rows.length-assessed.length;
    const categoryActions=rows.flatMap(r=>facts.get(r.id)!.actions);
    const high=rows.filter(r=>r.severity==="high"||r.severity==="critical").length;
    const rankReasons=[`${rows.length} active risk${rows.length===1?"":"s"}`,
      high?`${high} high or critical`:"No high or critical risks",
      `${new Set(rows.flatMap(r=>r.project_id?[r.project_id]:[])).size} affected projects`];
    const previous=input.priorSnapshot?.drivers.find(driver=>driver.category===c.id)?.activeRiskCount;
    const trendPercent=previous===undefined||previous===0?null:Math.round((rows.length-previous)/previous*1000)/10;
    return { category:c.id,label:c.label,activeRiskCount:rows.length,
      newRiskCount:rows.filter(r=>Date.parse(r.detected_at)>=start&&Date.parse(r.detected_at)<=end).length,
      closedRiskCount:risks.filter(r=>terminal.has(r.status)&&normalizeRiskCategory(r).normalizedCategory===c.id&&r.resolved_at&&Date.parse(r.resolved_at)>=start&&Date.parse(r.resolved_at)<=end).length,
      highCriticalCount:high, affectedProjectCount:new Set(rows.map(r=>r.project_id).filter(Boolean)).size,
      percentOfActiveRisks:active.length?Math.round(rows.length/active.length*1000)/10:0,
      assessedExposureCents:assessed.length?assessed.reduce((a,b)=>a+b,0):null, expectedExposureCents:null,
      overdueActionCount:categoryActions.filter(a=>!["completed","dismissed"].includes(a.status)&&!!a.due_at&&Date.parse(a.due_at)<input.now.getTime()).length,
      unassignedCount:rows.filter(r=>!r.assigned_user_id).length,
      withoutEvidenceCount:rows.filter(r=>!facts.get(r.id)!.evidence).length,
      averageAttentionScore:Math.round(rows.reduce((s,r)=>s+facts.get(r.id)!.attention.score,0)/rows.length),
      trendPercent, trendState:trendPercent===null?"unavailable" as const:trendPercent>5?"worsening" as const:trendPercent<-5?"improving" as const:"stable" as const, rankReasons,
      contributingRiskIds:rows.map(r=>r.id).slice(0,100),
      metadata:{calculatedAt:at,calculationVersion:RISK_ANALYTICS_VERSION,taxonomyVersion:RISK_TAXONOMY_VERSION,
        recordsIncluded:rows.length,recordsExcluded:risks.length-rows.length,
        missingInputs:[...(missing?["financial_exposure"]:[]),"probability","historical_snapshot"],
        quality:quality(missing,rows.length)} };
  }).toSorted((a,b)=>b.averageAttentionScore-a.averageAttentionScore||b.highCriticalCount-a.highCriticalCount||b.activeRiskCount-a.activeRiskCount||a.label.localeCompare(b.label));
  const executiveRisks=active.map(r=>({riskId:r.id,title:r.title,projectId:r.project_id,
    category:facts.get(r.id)!.mapping.normalizedCategory,severity:r.severity,
    attentionScore:facts.get(r.id)!.attention.score,reasons:facts.get(r.id)!.attention.reasons,
    exposureCents:exposureOf(r),href:`/risks/${r.id}`})).toSorted((a,b)=>b.attentionScore-a.attentionScore||a.title.localeCompare(b.title)).slice(0,20);
  const heatmap=projects.filter(p=>p.status==="active").map(p=>({projectId:p.id,projectName:p.name,
    cells:categories.map(c=>{
      const rows=active.filter(r=>r.project_id===p.id&&facts.get(r.id)!.mapping.normalizedCategory===c.id);
      const assessed=rows.map(exposureOf).filter((v):v is number=>v!==null);
      const highest=rows.toSorted((a,b)=>severityValue[b.severity]-severityValue[a.severity])[0]?.severity??null;
      const overdue=rows.filter(r=>facts.get(r.id)!.overdue).length;
      return {projectId:p.id,category:c.id,activeRiskCount:rows.length,highestSeverity:highest,
        attentionScore:rows.length?Math.max(...rows.map(r=>facts.get(r.id)!.attention.score)):null,
        assessedExposureCents:assessed.length?assessed.reduce((a,b)=>a+b,0):null,expectedExposureCents:null,
        overdueActionCount:overdue,unassignedCount:rows.filter(r=>!r.assigned_user_id).length,
        trendState:"unavailable" as const,
        withoutEvidenceCount:rows.filter(r=>!facts.get(r.id)!.evidence).length,
        contributingRiskIds:rows.map(r=>r.id),href:`/risks?project=${p.id}&category=${c.id}&origin=heatmap`,
        explanation:rows.length?`${rows.length} active ${categoryLabel(c.id).toLowerCase()} risk${rows.length===1?"":"s"}; highest severity ${highest}; ${overdue} overdue actions.`:"No active risks in this category.",
        quality:rows.length?quality(rows.length-assessed.length,rows.length):"unavailable" as DataState};
    })}));
  const assessed=active.map(exposureOf).filter((v):v is number=>v!==null), missing=active.length-assessed.length;
  return {summary:{activeRisks:active.length,highCriticalRisks:active.filter(r=>["high","critical"].includes(r.severity)).length,
    affectedProjects:new Set(active.map(r=>r.project_id).filter(Boolean)).size,
    assessedExposureCents:assessed.length?assessed.reduce((a,b)=>a+b,0):null,expectedExposureCents:null},
    drivers,executiveRisks,heatmap,categories,exclusions:["Probability unavailable: no authoritative probability field.","Expected exposure unavailable until probability is assessed."],
    metadata:{calculatedAt:at,calculationVersion:RISK_ANALYTICS_VERSION,taxonomyVersion:RISK_TAXONOMY_VERSION,
      recordsIncluded:risks.length,recordsExcluded:input.risks.length-risks.length,
      missingInputs:[...(missing?["financial_exposure"]:[]),"probability","historical_snapshot"],quality:quality(missing,active.length)}};
}
