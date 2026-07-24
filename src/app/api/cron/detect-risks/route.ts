import { cronSecretMatches } from "@/features/detection/cron-auth";
import { runDetection } from "@/features/detection/service";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  runOrganizationJobsSequentially,
  uniqueOrganizationJobTargets,
} from "@/lib/tenancy/organization-jobs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!secret)
    return Response.json({ error: "Cron is not configured." }, { status: 503 });
  if (!supplied || !cronSecretMatches(secret, supplied)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const client = createAdminSupabaseClient();
    const { data: memberships, error } = await client
      .from("organization_memberships")
      .select("organization_id,application_user_id")
      .order("created_at");
    if (error) throw new Error(error.message);
    const results = await runOrganizationJobsSequentially(
      uniqueOrganizationJobTargets(memberships ?? []),
      (target) =>
        runDetection({
          organizationId: target.organizationId,
          actorUserId: target.actorUserId,
          source: "scheduled",
        }),
    );
    return Response.json({ ok: true, organizations: results });
  } catch {
    return Response.json({ error: "Detection failed." }, { status: 500 });
  }
}
