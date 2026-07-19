"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  archiveDocumentAction,
  editDocumentAction,
} from "@/app/documents/[documentId]/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import {
  categoryOptions,
  inputClass,
} from "@/features/documents/document-upload-form";

type Option = { id: string; name: string };

export function DocumentMetadataForm({
  document,
  projects,
  vendors,
}: {
  document: {
    id: string;
    name: string;
    document_type: string;
    document_date: string | null;
    project_id: string | null;
    vendor_id: string | null;
    archived_at: string | null;
  };
  projects: readonly Option[];
  vendors: readonly Option[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const archived = Boolean(document.archived_at);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      documentId: document.id,
      name: formData.get("name"),
      category: formData.get("category"),
      projectId: formData.get("projectId"),
      vendorId: formData.get("vendorId"),
      documentDate: formData.get("documentDate"),
    };
    setError(null);
    startTransition(async () => {
      try {
        await editDocumentAction(input);
      } catch {
        setError("The metadata could not be saved.");
      }
    });
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-semibold">
        Display name
        <input
          name="name"
          required
          maxLength={240}
          defaultValue={document.name}
          disabled={pending || archived}
          className={`${inputClass} mt-2`}
        />
      </label>
      <label className="block text-sm font-semibold">
        Category
        <select
          name="category"
          defaultValue={document.document_type}
          disabled={pending || archived}
          className={`${inputClass} mt-2`}
        >
          {categoryOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Document date
        <input
          name="documentDate"
          type="date"
          defaultValue={document.document_date ?? ""}
          disabled={pending || archived}
          className={`${inputClass} mt-2`}
        />
      </label>
      <label className="block text-sm font-semibold">
        Project
        <select
          name="projectId"
          defaultValue={document.project_id ?? ""}
          disabled={pending || archived}
          className={`${inputClass} mt-2`}
        >
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Vendor or subcontractor
        <select
          name="vendorId"
          defaultValue={document.vendor_id ?? ""}
          disabled={pending || archived}
          className={`${inputClass} mt-2`}
        >
          <option value="">No vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <PrimaryButton disabled={pending || archived} type="submit">
          Save metadata
        </PrimaryButton>
        <SecondaryButton
          disabled={pending || archived}
          type="button"
          onClick={() => {
            if (
              !window.confirm(
                "Archive this document? Its stored file will no longer be available.",
              )
            )
              return;
            startTransition(async () => {
              try {
                await archiveDocumentAction({ documentId: document.id });
              } catch {
                setError("The document could not be archived.");
              }
            });
          }}
        >
          Archive document
        </SecondaryButton>
      </div>
    </form>
  );
}
