import "server-only";
import { calculatePortfolioRiskAnalytics } from "@/features/risk-analytics/calculations";
import type { RiskAnalyticsFilters } from "@/features/risk-analytics/types";
import type { RiskAnalyticsRepository } from "@/features/risk-analytics/repository";
import { canViewFinancialExposure, type ActorContext } from "@/lib/auth/authorization";

export class RiskAnalyticsService {
  constructor(private readonly repository:RiskAnalyticsRepository){}
  async getOrganizationAnalytics(input:{context:ActorContext;projectId?:string|null;filters?:RiskAnalyticsFilters;now?:Date}){
    const source=await this.repository.load(input.context,input.projectId);
    return calculatePortfolioRiskAnalytics({...source,now:input.now??new Date(),
      ...(input.filters?{filters:input.filters}:{}),
      canViewFinancials:canViewFinancialExposure(input.context)});
  }
}
