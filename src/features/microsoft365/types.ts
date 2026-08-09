export type MicrosoftOrganization = {
  id: string;
  displayName: string;
};

export type SharePointSite = {
  id: string;
  name: string;
  displayName?: string;
  webUrl: string;
};

export type SharePointDrive = {
  id: string;
  name: string;
  webUrl: string;
  driveType?: string;
};

export type DriveItem = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  eTag?: string;
  lastModifiedDateTime?: string;
  file?: {
    mimeType?: string;
    hashes?: { sha256Hash?: string; quickXorHash?: string };
  };
  folder?: { childCount?: number };
  deleted?: Record<string, never>;
};

export type GraphPage<T> = {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
};

export class MicrosoftGraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "authentication" | "permission" | "throttled" | "request",
  ) {
    super(message);
    this.name = "MicrosoftGraphError";
  }
}
