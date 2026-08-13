export type AdvisorMode =
  "auto" | "project" | "executive" | "risk" | "financial" | "forecast";

export type WorkspaceProject = Readonly<{
  id: string;
  name: string;
}>;

export type SearchResourceType =
  "project" | "risk" | "action" | "document" | "user";

export type SearchResource = Readonly<{
  id: string;
  type: SearchResourceType;
  title: string;
  detail: string | null;
  href: string;
}>;

export type WatchlistItemType = "project" | "risk" | "action";

export type WatchlistItem = Readonly<{
  id: string;
  type: WatchlistItemType;
  title: string;
  detail: string | null;
  href: string;
  addedAt: string;
}>;
