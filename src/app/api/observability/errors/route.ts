import { z } from "zod";

import { reportError } from "@/features/observability/service";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth/session";

const payloadSchema = z.object({
  name: z.string().max(120),
  message: z.string().max(2_000),
  stack: z.string().max(8_000).nullable(),
  path: z.string().max(500),
  metadata: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin)
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid report." }, { status: 400 });
  const [principal, membership] = await Promise.all([
    getCurrentUser(),
    getCurrentMembership(),
  ]);
  await reportError({
    error: Object.assign(new Error(parsed.data.message), {
      name: parsed.data.name,
      stack: parsed.data.stack ?? undefined,
    }),
    source: "client",
    headers: request.headers,
    requestPath: parsed.data.path,
    requestMethod: "CLIENT",
    metadata: parsed.data.metadata,
    authUserId: principal?.id ?? null,
    applicationUserId: membership?.applicationUserId ?? null,
    organizationId: membership?.organizationId ?? null,
  });
  return new Response(null, { status: 202 });
}
