import { cronSecretMatches } from "@/features/detection/cron-auth";
import { DataExportWorker } from "@/features/data-exports/worker";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!secret)
    return Response.json({ error: "Cron is not configured." }, { status: 503 });
  if (!supplied || !cronSecretMatches(secret, supplied))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return Response.json({
      ok: true,
      ...(await new DataExportWorker(createAdminSupabaseClient()).run()),
    });
  } catch {
    return Response.json(
      { error: "Data export processing failed." },
      { status: 500 },
    );
  }
}

