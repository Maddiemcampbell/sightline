export const PORTFOLIO_PAGE_SIZE = 20;

export type PaginatedResult<T, TSummary = undefined> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  summary: TSummary;
};
