import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { DocumentMetadataForm } from "@/features/documents/document-metadata-form";
import { getDocumentDetail } from "@/features/documents/data";

type Props = { params: Promise<{ documentId: string }> };

export default async function DocumentDetailPage({ params }: Props) {
  const { documentId } = await params;
  const detail = await getDocumentDetail(documentId);
  if (!detail) notFound();
  const project = detail.projects.find(
    (item) => item.id === detail.document.project_id,
  );
  const vendor = detail.vendors.find(
    (item) => item.id === detail.document.vendor_id,
  );
  const archived = Boolean(detail.document.archived_at);
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <Link href="/documents" className="text-muted text-sm font-semibold">
        ← Documents
      </Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 gap-4">
          <span className="bg-accent text-deep-green grid size-12 shrink-0 place-items-center rounded-xl">
            <FileText aria-hidden="true" className="size-6" />
          </span>
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="bg-soft-green text-deep-green rounded-full px-2.5 py-1 text-xs font-semibold capitalize">
                {detail.document.processing_status}
              </span>
              {archived ? (
                <span className="bg-soft-red text-danger rounded-full px-2.5 py-1 text-xs font-semibold">
                  Archived
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] break-words">
              {detail.document.name}
            </h1>
            <p className="text-muted mt-2">
              {detail.document.original_filename ?? "Metadata-only document"}
            </p>
          </div>
        </div>
        {!archived && detail.document.storage_path ? (
          <a
            href={`/api/documents/${documentId}/download`}
            className="bg-deep-green inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white"
          >
            <Download aria-hidden="true" className="size-4" />
            Download file
          </a>
        ) : null}
      </header>
      <section
        aria-label="Document summary"
        className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Summary
          label="Category"
          value={detail.document.document_type.replaceAll("_", " ")}
        />
        <Summary label="Project" value={project?.name ?? "Not assigned"} />
        <Summary label="Vendor" value={vendor?.name ?? "Not assigned"} />
        <Summary
          label="File size"
          value={formatBytes(detail.document.size_bytes)}
        />
      </section>
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Metadata</h2>
          <DocumentMetadataForm
            document={detail.document}
            projects={detail.projects}
            vendors={detail.vendors}
          />
        </Card>
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Activity</h2>
          {detail.activities.length ? (
            <ol className="space-y-4">
              {detail.activities.map((activity) => (
                <li key={activity.id} className="border-border border-l-2 pl-3">
                  <p className="text-sm font-semibold capitalize">
                    {activity.activity_type}
                  </p>
                  <p className="text-muted mt-1 text-sm">{activity.note}</p>
                  <time className="text-muted mt-1 block text-xs">
                    {new Date(activity.occurred_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted text-sm">No activity has been recorded.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-muted text-xs font-semibold uppercase">{label}</p>
      <p className="mt-2 text-sm font-semibold capitalize">{value}</p>
    </Card>
  );
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return "Not available";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
