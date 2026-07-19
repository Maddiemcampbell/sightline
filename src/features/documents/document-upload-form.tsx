"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { PrimaryButton } from "@/components/ui/button";
import { MAX_DOCUMENT_BYTES } from "@/features/documents/validation";

type Option = { id: string; name: string };

export function DocumentUploadForm({
  projects,
  vendors,
}: {
  projects: readonly Option[];
  vendors: readonly Option[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);

  function upload(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError("Files must be 10 MB or smaller.");
      return;
    }
    setError(null);
    setUploadedId(null);
    setUploading(true);
    setProgress(0);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/documents");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      setUploading(false);
      const response = parseResponse(request.responseText);
      if (
        request.status >= 200 &&
        request.status < 300 &&
        response.documentId
      ) {
        setProgress(100);
        setUploadedId(response.documentId);
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(response.error ?? "The document could not be uploaded.");
      }
    });
    request.addEventListener("error", () => {
      setUploading(false);
      setError("The upload was interrupted. Please try again.");
    });
    request.send(formData);
  }

  return (
    <form
      ref={formRef}
      action={upload}
      className="border-border bg-surface rounded-xl border p-5"
    >
      <div className="flex items-center gap-3">
        <span className="bg-accent text-deep-green grid size-10 place-items-center rounded-lg">
          <Upload aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Upload source document</h2>
          <p className="text-muted text-sm">
            PDF, DOCX, CSV, JPG, or PNG · 10 MB max
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="File">
          <input
            required
            name="file"
            type="file"
            accept=".pdf,.docx,.csv,.jpg,.jpeg,.png"
            className="border-border h-11 w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Display name">
          <input required name="name" maxLength={240} className={inputClass} />
        </Field>
        <Field label="Category">
          <select
            required
            name="category"
            className={inputClass}
            defaultValue="other"
          >
            {categoryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Document date">
          <input name="documentDate" type="date" className={inputClass} />
        </Field>
        <Field label="Project">
          <select name="projectId" className={inputClass} defaultValue="">
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vendor or subcontractor">
          <select name="vendorId" className={inputClass} defaultValue="">
            <option value="">No vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {uploading ? (
        <div className="mt-5" role="status" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span>Uploading securely…</span>
            <span>{progress}%</span>
          </div>
          <progress className="mt-2 h-2 w-full" max={100} value={progress}>
            {progress}%
          </progress>
        </div>
      ) : null}
      {error ? (
        <p className="text-danger mt-4 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {uploadedId ? (
        <p className="text-deep-green mt-4 text-sm" role="status">
          Upload complete.{" "}
          <Link
            className="font-semibold underline"
            href={`/documents/${uploadedId}`}
          >
            View document
          </Link>
        </p>
      ) : null}
      <PrimaryButton className="mt-5" disabled={uploading} type="submit">
        {uploading ? "Uploading…" : "Upload document"}
      </PrimaryButton>
    </form>
  );
}

function parseResponse(value: string): { error?: string; documentId?: string } {
  try {
    return JSON.parse(value) as { error?: string; documentId?: string };
  } catch {
    return {};
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <span className="mt-2 block font-normal">{children}</span>
    </label>
  );
}

export const categoryOptions = [
  ["contract", "Contract"],
  ["insurance", "Certificate of insurance"],
  ["daily_log", "Daily log"],
  ["rfi", "RFI"],
  ["change_order", "Change order"],
  ["schedule", "Schedule"],
  ["incident_report", "Incident report"],
  ["other", "Other"],
] as const;

export const inputClass =
  "border-border h-11 w-full rounded-md border px-3 text-sm";
