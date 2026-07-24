export type OrganizationJobTarget = Readonly<{
  organizationId: string;
  actorUserId: string;
}>;

export function uniqueOrganizationJobTargets(
  rows: readonly Readonly<{
    organization_id: string;
    application_user_id: string;
  }>[],
): OrganizationJobTarget[] {
  const targets = new Map<string, OrganizationJobTarget>();
  for (const row of rows) {
    if (!targets.has(row.organization_id)) {
      targets.set(row.organization_id, {
        organizationId: row.organization_id,
        actorUserId: row.application_user_id,
      });
    }
  }
  return [...targets.values()];
}

export async function runOrganizationJobsSequentially<
  TTarget extends Readonly<{ organizationId: string }>,
  TResult,
>(
  targets: readonly TTarget[],
  worker: (target: TTarget) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = [];
  for (const target of targets) results.push(await worker(target));
  return results;
}
