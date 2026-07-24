import type { AuthorizationSubject } from "@/lib/auth/authorization";
import { canViewDocument } from "@/lib/auth/authorization";
import { isDocumentStoragePath } from "@/features/documents/storage-isolation";

export const DOCUMENT_SIGNED_URL_TTL_SECONDS = 60;

type DownloadDocument = Readonly<{
  id: string;
  organization_id: string;
  storage_path: string | null;
  archived_at: string | null;
}>;

export function isDocumentDownloadAllowed(
  subject: AuthorizationSubject,
  document: DownloadDocument | null,
): document is DownloadDocument & { storage_path: string } {
  return Boolean(
    document &&
    canViewDocument(subject, document) &&
    !document.archived_at &&
    document.storage_path &&
    isDocumentStoragePath(
      subject.organizationId,
      document.id,
      document.storage_path,
    ),
  );
}
