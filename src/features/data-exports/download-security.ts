import {
  canExportOrganizationData,
  type AuthorizationSubject,
} from "@/lib/auth/authorization";

export type DownloadableExport = Readonly<{
  organization_id: string;
  status: string;
  storage_path: string | null;
  expires_at: string | null;
}>;

export function isExportDownloadAllowed(
  subject: AuthorizationSubject | null,
  job: DownloadableExport | null,
  now: number,
): job is DownloadableExport {
  return Boolean(
    job &&
      canExportOrganizationData(subject, job) &&
      job.status === "ready" &&
      job.storage_path &&
      job.expires_at &&
      Date.parse(job.expires_at) > now,
  );
}
