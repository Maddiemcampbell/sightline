import { recordAuditEvent } from "@/features/audit/service";
import { getForecastingView } from "@/features/forecasting/data";
import { getReportsData } from "@/features/reports/data";
import {
  buildExecutiveDeck,
  isExecutiveDeckTemplate,
} from "@/features/reports/executive-deck";
import { requireActorContext } from "@/lib/auth/request-context";
import { requireCurrentMembership } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestedTemplate =
    new URL(request.url).searchParams.get("template") ?? "";
  if (!isExecutiveDeckTemplate(requestedTemplate)) {
    return Response.json(
      { error: "Select a valid executive deck template." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const [actor, membership, reports, forecast] = await Promise.all([
    requireActorContext(),
    requireCurrentMembership(),
    getReportsData(),
    getForecastingView(),
  ]);
  const generatedAt = new Date();
  const deck = await buildExecutiveDeck({
    organizationName: membership.organization.name,
    template: requestedTemplate,
    generatedAt,
    baseUrl: new URL(request.url).origin,
    reports,
    forecast,
  });
  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorAuthUserId: actor.authUserId,
    actorUserId: actor.userId,
    action: "report.downloaded",
    resourceType: "executive_deck",
    resourceId: actor.organizationId,
    metadata: { template: requestedTemplate, format: "pptx", slideCount: 8 },
  });
  const date = generatedAt.toISOString().slice(0, 10);
  return new Response(
    deck.buffer.slice(
      deck.byteOffset,
      deck.byteOffset + deck.byteLength,
    ) as ArrayBuffer,
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="sightline-${requestedTemplate}-${date}.pptx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
