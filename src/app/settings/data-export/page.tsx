import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { DataExportForm } from "@/app/settings/data-export/export-form";
import { DataExportRepository } from "@/features/data-exports/repository";
import { canExportOrganizationData } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DataExportPage() {
  const context = await requireActorContext();
  if (!canExportOrganizationData(context)) notFound();
  const exports = await new DataExportRepository(
    createAdminSupabaseClient(),
  ).list(context.organizationId);
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Export organization data</h2>
        <p className="text-muted mt-2 mb-6 max-w-3xl text-sm">
          Create a portable copy of projects, risks, actions, document metadata,
          vendors, activity, comments, AI conversations, and Daily Briefs.
          Credentials, secrets, storage locations, and internal telemetry are excluded.
        </p>
        <DataExportForm />
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Export history</h2>
        {exports.length === 0 ? (
          <p className="text-muted mt-3 text-sm">
            No exports have been requested for this organization.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-muted border-border border-b">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Requested by</th>
                  <th className="py-3 pr-4 font-semibold">Requested</th>
                  <th className="py-3 pr-4 font-semibold">Format</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Expires</th>
                  <th className="py-3 font-semibold"><span className="sr-only">Download</span></th>
                </tr>
              </thead>
              <tbody>
                {exports.map((item) => (
                  <tr key={item.id} className="border-border border-b last:border-0">
                    <td className="py-4 pr-4">
                      <p className="font-semibold">{item.requested_by_name}</p>
                      <p className="text-muted">{item.requested_by_email}</p>
                    </td>
                    <td className="py-4 pr-4">{formatDate(item.requested_at)}</td>
                    <td className="py-4 pr-4 uppercase">{item.export_format}</td>
                    <td className="py-4 pr-4 capitalize">{item.status}</td>
                    <td className="py-4 pr-4">{item.expires_at ? formatDate(item.expires_at) : "—"}</td>
                    <td className="py-4 text-right">
                      {isDownloadReady(item.status, item.expires_at) ? (
                        <Link className="text-deep-green font-semibold underline" href={`/api/data-exports/${item.id}/download`}>
                          Download
                        </Link>
                      ) : (
                        <span className="text-muted">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isDownloadReady(status: string, expiresAt: string | null) {
  return status === "ready" && Boolean(expiresAt && Date.parse(expiresAt) > Date.now());
}
