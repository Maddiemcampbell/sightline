"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AdvisorMode,
  SearchResource,
  WatchlistItem,
  WorkspaceProject,
} from "@/features/workspace/types";

type WorkspaceResourcesValue = Readonly<{
  organizationId: string;
  projects: readonly WorkspaceProject[];
  searchResources: readonly SearchResource[];
}>;
type DashboardStateValue = Readonly<{
  selectedProjectId: string;
  setSelectedProjectId: (projectId: string) => void;
  advisorMode: AdvisorMode;
  setAdvisorMode: (mode: AdvisorMode) => void;
  stateReady: boolean;
}>;
type QuickAskValue = Readonly<{
  quickAskDraft: string;
  setQuickAskDraft: (draft: string) => void;
  stateReady: boolean;
}>;
type WatchlistValue = Readonly<{
  watchlist: readonly WatchlistItem[];
  toggleWatchlist: (item: Omit<WatchlistItem, "addedAt">) => void;
  isWatchlisted: (type: WatchlistItem["type"], id: string) => boolean;
  stateReady: boolean;
}>;

const WorkspaceResourcesContext = createContext<WorkspaceResourcesValue | null>(
  null,
);
const DashboardStateContext = createContext<DashboardStateValue | null>(null);
const QuickAskContext = createContext<QuickAskValue | null>(null);
const WatchlistContext = createContext<WatchlistValue | null>(null);

const advisorModes: readonly AdvisorMode[] = [
  "project",
  "executive",
  "risk",
  "financial",
];

export function WorkspaceProvider({
  organizationId,
  userId,
  projects,
  searchResources,
  children,
}: {
  organizationId: string;
  userId: string;
  projects: readonly WorkspaceProject[];
  searchResources: readonly SearchResource[];
  children: ReactNode;
}) {
  const [selectedProjectId, setSelectedProjectIdState] = useState("all");
  const [advisorMode, setAdvisorModeState] = useState<AdvisorMode>("project");
  const [quickAskDraft, setQuickAskDraftState] = useState("");
  const [watchlist, setWatchlist] = useState<readonly WatchlistItem[]>([]);
  const [stateReady, setStateReady] = useState(false);
  const storagePrefix = `sightline:${userId}:${organizationId}`;

  useEffect(() => {
    let cancelled = false;
    let restoredProjectId = "all";
    let restoredMode: AdvisorMode = "project";
    let restoredDraft = "";
    let restoredWatchlist: WatchlistItem[] = [];
    try {
      const projectId =
        window.localStorage.getItem(`${storagePrefix}:project`) ?? "all";
      restoredProjectId =
        projectId === "all" ||
        projects.some((project) => project.id === projectId)
          ? projectId
          : "all";
      const storedMode = window.localStorage.getItem(
        `${storagePrefix}:advisor`,
      ) as AdvisorMode | null;
      if (storedMode && advisorModes.includes(storedMode))
        restoredMode = storedMode;
      restoredDraft =
        window.sessionStorage.getItem(`${storagePrefix}:quick-ask`) ?? "";
      const storedWatchlist = window.localStorage.getItem(
        `${storagePrefix}:watchlist`,
      );
      if (storedWatchlist)
        restoredWatchlist = normalizeWatchlist(JSON.parse(storedWatchlist));
    } catch {
      // Storage can be unavailable or malformed in privacy-focused browsers.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setSelectedProjectIdState(restoredProjectId);
      setAdvisorModeState(restoredMode);
      setQuickAskDraftState(restoredDraft);
      setWatchlist(restoredWatchlist);
      setStateReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [projects, storagePrefix]);

  const setSelectedProjectId = useCallback(
    (projectId: string) => {
      const safeProjectId =
        projectId === "all" ||
        projects.some((project) => project.id === projectId)
          ? projectId
          : "all";
      setSelectedProjectIdState(safeProjectId);
      try {
        window.localStorage.setItem(`${storagePrefix}:project`, safeProjectId);
      } catch {}
    },
    [projects, storagePrefix],
  );

  const setAdvisorMode = useCallback(
    (mode: AdvisorMode) => {
      setAdvisorModeState(mode);
      try {
        window.localStorage.setItem(`${storagePrefix}:advisor`, mode);
      } catch {}
    },
    [storagePrefix],
  );

  const setQuickAskDraft = useCallback(
    (draft: string) => {
      setQuickAskDraftState(draft);
      try {
        window.sessionStorage.setItem(`${storagePrefix}:quick-ask`, draft);
      } catch {}
    },
    [storagePrefix],
  );

  const toggleWatchlist = useCallback(
    (item: Omit<WatchlistItem, "addedAt">) => {
      setWatchlist((current) => {
        const exists = current.some(
          (entry) => entry.type === item.type && entry.id === item.id,
        );
        const next = exists
          ? current.filter(
              (entry) => entry.type !== item.type || entry.id !== item.id,
            )
          : [...current, { ...item, addedAt: new Date().toISOString() }];
        try {
          window.localStorage.setItem(
            `${storagePrefix}:watchlist`,
            JSON.stringify(next),
          );
        } catch {}
        return next;
      });
    },
    [storagePrefix],
  );

  const isWatchlisted = useCallback(
    (type: WatchlistItem["type"], id: string) =>
      watchlist.some((item) => item.type === type && item.id === id),
    [watchlist],
  );

  const resourcesValue = useMemo(
    () => ({
      organizationId,
      projects,
      searchResources,
    }),
    [organizationId, projects, searchResources],
  );
  const dashboardValue = useMemo(
    () => ({
      selectedProjectId,
      setSelectedProjectId,
      advisorMode,
      setAdvisorMode,
      stateReady,
    }),
    [
      advisorMode,
      selectedProjectId,
      setAdvisorMode,
      setSelectedProjectId,
      stateReady,
    ],
  );
  const quickAskValue = useMemo(
    () => ({
      quickAskDraft,
      setQuickAskDraft,
      stateReady,
    }),
    [quickAskDraft, setQuickAskDraft, stateReady],
  );
  const watchlistValue = useMemo(
    () => ({
      watchlist,
      toggleWatchlist,
      isWatchlisted,
      stateReady,
    }),
    [isWatchlisted, stateReady, toggleWatchlist, watchlist],
  );

  return (
    <WorkspaceResourcesContext.Provider value={resourcesValue}>
      <DashboardStateContext.Provider value={dashboardValue}>
        <QuickAskContext.Provider value={quickAskValue}>
          <WatchlistContext.Provider value={watchlistValue}>
            {children}
          </WatchlistContext.Provider>
        </QuickAskContext.Provider>
      </DashboardStateContext.Provider>
    </WorkspaceResourcesContext.Provider>
  );
}

export function useWorkspaceResources() {
  const context = useContext(WorkspaceResourcesContext);
  if (!context)
    throw new Error(
      "useWorkspaceResources must be used inside WorkspaceProvider.",
    );
  return context;
}

export function useDashboardState() {
  const context = useContext(DashboardStateContext);
  if (!context)
    throw new Error("useDashboardState must be used inside WorkspaceProvider.");
  return context;
}

export function useQuickAsk() {
  const context = useContext(QuickAskContext);
  if (!context)
    throw new Error("useQuickAsk must be used inside WorkspaceProvider.");
  return context;
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context)
    throw new Error("useWatchlist must be used inside WorkspaceProvider.");
  return context;
}

function normalizeWatchlist(value: unknown): WatchlistItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is WatchlistItem =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      typeof item.id === "string" &&
      "type" in item &&
      (item.type === "project" ||
        item.type === "risk" ||
        item.type === "action") &&
      "title" in item &&
      typeof item.title === "string" &&
      "detail" in item &&
      (item.detail === null || typeof item.detail === "string") &&
      "href" in item &&
      typeof item.href === "string" &&
      item.href.startsWith("/") &&
      "addedAt" in item &&
      typeof item.addedAt === "string",
  );
}
