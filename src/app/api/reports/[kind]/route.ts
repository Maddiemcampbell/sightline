import { recordAuditEvent } from "@/features/audit/service";
import { getReportsData } from "@/features/reports/data";
import { buildReportPdf, type ReportKind } from "@/features/reports/pdf";
import { requireActorContext } from "@/lib/auth/request-context";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/reports/[kind]">,
) {
  const actor = await requireActorContext();
  const { kind: rawKind } = await context.params;
  if (!isReportKind(rawKind)) return unavailable();
  const data = await getReportsData();
  if (rawKind === "financial" && !data.financialAnalytics) return unavailable();

  const generatedAt = new Date();
  const pdf = await buildReportPdf({ kind: rawKind, data, generatedAt });
  await recordAuditEvent({
    organizationId: actor.organizationId,
    actorAuthUserId: actor.authUserId,
    actorUserId: actor.userId,
    action: "report.downloaded",
    resourceType: "portfolio_report",
    resourceId: actor.organizationId,
    metadata: { kind: rawKind, format: "pdf" },
  });
  const date = generatedAt.toISOString().slice(0, 10);
  return new Response(Uint8Array.from(pdf).buffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="sightline-${rawKind}-report-${date}.pdf"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isReportKind(value: string): value is ReportKind {
  return value === "risk" || value === "financial";
}

function unavailable() {
  return Response.json(
    { error: "Report not found." },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
