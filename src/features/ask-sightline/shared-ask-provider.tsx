"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { askOrganizationSightlineAction } from "@/app/ask/actions";
import { organizationCitationSchema } from "@/domain/ai/organization-question";
import type { SharedAskMessage } from "@/features/ask-sightline/shared-types";
import {
  useDashboardState,
  useWorkspaceResources,
} from "@/features/workspace/workspace-provider";

type SharedAskContextValue = Readonly<{
  messages: readonly SharedAskMessage[];
  ask: (question: string, options?: { openDrawer?: boolean }) => void;
  clearConversation: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  pending: boolean;
  error: string | null;
  retryQuestion: string | null;
  ready: boolean;
}>;

const SharedAskContext = createContext<SharedAskContextValue | null>(null);

export function SharedAskProvider({
  storageIdentity,
  children,
}: {
  storageIdentity: string;
  children: ReactNode;
}) {
  const { advisorMode, selectedProjectId } = useDashboardState();
  const { canUseAi } = useWorkspaceResources();
  const [messages, setMessages] = useState<readonly SharedAskMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const storageKey = `sightline:${storageIdentity}:organization-conversation`;

  useEffect(() => {
    let cancelled = false;
    let restored: SharedAskMessage[] = [];
    try {
      const value = window.sessionStorage.getItem(storageKey);
      if (value) restored = normalizeMessages(JSON.parse(value));
    } catch {
      // Session storage can be unavailable or malformed.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setMessages(restored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const persistMessages = useCallback(
    (next: readonly SharedAskMessage[]) => {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // The active conversation still works when storage is unavailable.
      }
    },
    [storageKey],
  );

  const ask = useCallback(
    (question: string, options?: { openDrawer?: boolean }) => {
      const trimmed = question.trim();
      if (trimmed.length < 3 || pending) return;
      if (options?.openDrawer !== false) setOpen(true);
      setError(null);
      setRetryQuestion(trimmed);
      if (!canUseAi) {
        setError(
          "Your organization role does not permit access to Ask Sightline.",
        );
        return;
      }
      const optimistic: SharedAskMessage = {
        id: `pending-${crypto.randomUUID()}`,
        role: "user",
        content: trimmed,
        citations: [],
        confidence: null,
        missingInformation: [],
        suggestedFollowUps: [],
      };
      setMessages((current) => {
        const next = [...current, optimistic].slice(-30);
        persistMessages(next);
        return next;
      });
      startTransition(async () => {
        try {
          const answer = await askOrganizationSightlineAction({
            question: trimmed,
            advisorMode,
            projectId: selectedProjectId,
            history: messages.slice(-12).map(({ role, content }) => ({
              role,
              content,
            })),
          });
          setMessages((current) => {
            const next: readonly SharedAskMessage[] = [
              ...current,
              answer,
            ].slice(-30);
            persistMessages(next);
            return next;
          });
        } catch (caught) {
          setMessages((current) => {
            const next = current.filter(
              (message) => message.id !== optimistic.id,
            );
            persistMessages(next);
            return next;
          });
          setError(
            caught instanceof Error
              ? caught.message
              : "Sightline could not answer that question.",
          );
        }
      });
    },
    [
      advisorMode,
      canUseAi,
      messages,
      pending,
      persistMessages,
      selectedProjectId,
    ],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setRetryQuestion(null);
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const value = useMemo(
    () => ({
      messages,
      ask,
      clearConversation,
      open,
      setOpen,
      pending,
      error,
      retryQuestion,
      ready,
    }),
    [
      ask,
      clearConversation,
      error,
      messages,
      open,
      pending,
      ready,
      retryQuestion,
    ],
  );
  return (
    <SharedAskContext.Provider value={value}>
      {children}
    </SharedAskContext.Provider>
  );
}

export function useSharedAsk() {
  const context = useContext(SharedAskContext);
  if (!context)
    throw new Error("useSharedAsk must be used inside SharedAskProvider.");
  return context;
}

function normalizeMessages(value: unknown): SharedAskMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((message) => {
      if (
        typeof message !== "object" ||
        message === null ||
        !("id" in message) ||
        typeof message.id !== "string" ||
        !("role" in message) ||
        (message.role !== "user" && message.role !== "assistant") ||
        !("content" in message) ||
        typeof message.content !== "string"
      )
        return [];
      const citations =
        "citations" in message && Array.isArray(message.citations)
          ? message.citations
              .flatMap((citation: unknown) => {
                const parsed = organizationCitationSchema.safeParse(citation);
                return parsed.success ? [parsed.data] : [];
              })
              .slice(0, 20)
          : [];
      return [
        {
          id: message.id,
          role: message.role,
          content: message.content.slice(0, 8_000),
          citations,
          confidence:
            "confidence" in message && typeof message.confidence === "number"
              ? Math.max(0, Math.min(100, Math.round(message.confidence)))
              : null,
          missingInformation:
            "missingInformation" in message &&
            Array.isArray(message.missingInformation)
              ? message.missingInformation
                  .filter(
                    (item: unknown): item is string => typeof item === "string",
                  )
                  .slice(0, 8)
              : [],
          suggestedFollowUps:
            "suggestedFollowUps" in message &&
            Array.isArray(message.suggestedFollowUps)
              ? message.suggestedFollowUps
                  .filter(
                    (item: unknown): item is string => typeof item === "string",
                  )
                  .slice(0, 4)
              : [],
        },
      ];
    })
    .slice(-30);
}
