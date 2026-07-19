import Link from "next/link";
import { FileText, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { DocumentUploadForm } from "@/features/documents/document-upload-form";
import { getDocumentWorkspace } from "@/features/documents/data";
import { documentSearchSchema } from "@/features/documents/validation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsPage({ searchParams }: Props) {
  const { q } = documentSearchSchema.parse(await searchParams);
  const { documents, projects, vendors } = await getDocumentWorkspace(q);
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-muted text-sm font-semibold">Source material</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Documents
        </h1>
        <p className="text-muted mt-2">
          Securely manage the source files behind Sightline’s risk intelligence.
        </p>
      </header>
      <div className="mt-7 grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <DocumentUploadForm projects={projects} vendors={vendors} />
        <section aria-labelledby="document-library-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="document-library-heading"
                className="text-xl font-semibold"
              >
                Document library
              </h2>
              <p className="text-muted mt-1 text-sm">
                {documents.length} active documents
              </p>
            </div>
            <form method="get" className="relative">
              <label>
                <span className="sr-only">Search documents</span>
                <Search
                  aria-hidden="true"
                  className="text-muted absolute top-3 left-3 size-4"
                />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search documents…"
                  className="border-border h-10 w-64 rounded-md border pr-3 pl-9 text-sm"
                />
              </label>
            </form>
          </div>
          {documents.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No documents found"
                description={
                  q
                    ? "Try a broader search."
                    : "Upload the first source document for BuildCo."
                }
              />
            </div>
          ) : (
            <div className="border-border bg-surface mt-4 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-muted bg-background border-b text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Document</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Project</th>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <FileText
                            aria-hidden="true"
                            className="text-deep-green size-5 shrink-0"
                          />
                          <div>
                            <Link
                              href={`/documents/${document.id}`}
                              className="hover:text-deep-green font-semibold"
                            >
                              {document.name}
                            </Link>
                            <p className="text-muted mt-1 text-xs">
                              {document.original_filename ?? "Metadata only"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 capitalize">
                        {labelCategory(document.document_type)}
                      </td>
                      <td className="px-4 py-4">
                        {document.projectName ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        {document.vendorName ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-soft-green text-deep-green rounded-full px-2.5 py-1 text-xs font-semibold capitalize">
                          {document.processing_status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/documents/${document.id}`}
                          className="text-deep-green font-semibold"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function labelCategory(value: string) {
  if (value === "insurance") return "certificate of insurance";
  if (value === "rfi") return "RFI";
  return value.replaceAll("_", " ");
}
