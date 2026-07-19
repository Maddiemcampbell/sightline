import { cronSecretMatches } from "@/features/detection/cron-auth";
import { deliverScheduledMorningBriefs } from "@/features/email/delivery-service";
import { getServerEnv } from "@/lib/env";

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
    const summary = await deliverScheduledMorningBriefs();
    return Response.json({ ok: true, ...summary });
  } catch {
    return Response.json(
      { error: "Morning email delivery failed." },
      { status: 500 },
    );
  }
}
