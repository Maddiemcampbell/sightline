export const POSTGREST_PAGE_SIZE = 1_000;

type PageError = {
  readonly message: string;
};

export type RowPage<T> = {
  readonly data: T[] | null;
  readonly error: PageError | null;
  readonly count?: number | null;
};

/**
 * Collects a complete, deterministically ordered PostgREST result set.
 * Callers must apply a stable order before applying the supplied range.
 */
export async function collectAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<RowPage<T>>,
  pageSize = POSTGREST_PAGE_SIZE,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("PostgREST page size must be a positive integer.");
  }

  const rows: T[] = [];
  let from = 0;
  let expectedCount: number | null = null;
  for (;;) {
    const result = await fetchPage(from, from + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    const resultPage = result.data ?? [];
    expectedCount = result.count ?? expectedCount;
    rows.push(...resultPage);
    if (expectedCount !== null && rows.length >= expectedCount) {
      return rows.slice(0, expectedCount);
    }
    if (resultPage.length === 0) return rows;
    if (expectedCount === null && resultPage.length < pageSize) return rows;
    from += resultPage.length;
  }
}
