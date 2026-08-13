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
import type {
  SharedAskConversation,
  SharedAskMessage,
} from "@/features/ask-sightline/shared-types";
import {
  useDashboardState,
  useWorkspaceResources,
} from "@/features/workspace/workspace-provider";

type SharedAskContextValue = Readonly<{
  messages: readonly SharedAskMessage[];
  conversations: readonly SharedAskConversation[];
  activeConversationId: string | null;
  ask: (question: string, options?: { openDrawer?: boolean }) => void;
  clearConversation: () => void;
  selectConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
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
  const [conversations, setConversations] = useState<
    readonly SharedAskConversation[]
  >([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const storageKey = `sightline:${storageIdentity}:organization-conversation`;
  const historyKey = `${storageKey}:history-v1`;
  const activeKey = `${storageKey}:active`;

  useEffect(() => {
    let cancelled = false;
    let restoredConversations: SharedAskConversation[] = [];
    let restoredActiveId: string | null = null;
    try {
      const history = window.localStorage.getItem(historyKey);
      if (history)
        restoredConversations = normalizeConversations(JSON.parse(history));
      restoredActiveId = window.localStorage.getItem(activeKey);
      if (!restoredConversations.length) {
        const legacy = window.sessionStorage.getItem(storageKey);
        const legacyMessages = legacy
          ? normalizeMessages(JSON.parse(legacy))
          : [];
        if (legacyMessages.length) {
          const migrated = conversationFromMessages(legacyMessages);
          restoredConversations = [migrated];
          restoredActiveId = migrated.id;
        }
      }
    } catch {
      // Browser storage can be unavailable or malformed.
    }
    const active =
      restoredConversations.find(
        (conversation) => conversation.id === restoredActiveId,
      ) ?? restoredConversations[0];
    queueMicrotask(() => {
      if (cancelled) return;
      setConversations(restoredConversations);
      setActiveConversationId(active?.id ?? null);
      setMessages(active?.messages ?? []);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activeKey, historyKey, storageKey]);

  const persistConversations = useCallback(
    (next: readonly SharedAskConversation[], activeId: string | null) => {
      try {
        window.localStorage.setItem(historyKey, JSON.stringify(next));
        if (activeId) window.localStorage.setItem(activeKey, activeId);
        else window.localStorage.removeItem(activeKey);
      } catch {
        // The active conversation still works if browser storage is blocked.
      }
    },
    [activeKey, historyKey],
  );

  const commitMessages = useCallback(
    (
      conversationId: string,
      nextMessages: readonly SharedAskMessage[],
      title?: string,
    ) => {
      setMessages(nextMessages);
      setConversations((current) => {
        const existing = current.find((item) => item.id === conversationId);
        const nextConversation: SharedAskConversation = {
          id: conversationId,
          title: title ?? existing?.title ?? conversationTitle(nextMessages),
          updatedAt: new Date().toISOString(),
          messages: nextMessages,
        };
        const next = [
          nextConversation,
          ...current.filter((item) => item.id !== conversationId),
        ].slice(0, 20);
        persistConversations(next, conversationId);
        return next;
      });
    },
    [persistConversations],
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
      const conversationId = activeConversationId ?? crypto.randomUUID();
      if (!activeConversationId) setActiveConversationId(conversationId);
      const optimisticMessages = [...messages, optimistic].slice(-30);
      commitMessages(
        conversationId,
        optimisticMessages,
        activeConversationId ? undefined : titleFromQuestion(trimmed),
      );
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
          commitMessages(
            conversationId,
            [...optimisticMessages, answer].slice(-30),
          );
        } catch (caught) {
          const next = optimisticMessages.filter(
            (message) => message.id !== optimistic.id,
          );
          if (next.length) commitMessages(conversationId, next);
          else {
            setMessages([]);
            setConversations((current) => {
              const remaining = current.filter(
                (item) => item.id !== conversationId,
              );
              persistConversations(remaining, null);
              return remaining;
            });
            setActiveConversationId(null);
          }
          setError(getAskSightlineErrorMessage(caught));
        }
      });
    },
    [
      advisorMode,
      activeConversationId,
      canUseAi,
      commitMessages,
      messages,
      pending,
      persistConversations,
      selectedProjectId,
    ],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    setRetryQuestion(null);
    try {
      window.localStorage.removeItem(activeKey);
    } catch {}
  }, [activeKey]);

  const selectConversation = useCallback(
    (conversationId: string) => {
      const selected = conversations.find(
        (conversation) => conversation.id === conversationId,
      );
      if (!selected) return;
      setActiveConversationId(selected.id);
      setMessages(selected.messages);
      setError(null);
      setRetryQuestion(null);
      persistConversations(conversations, selected.id);
    },
    [conversations, persistConversations],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      const remaining = conversations.filter(
        (conversation) => conversation.id !== conversationId,
      );
      if (activeConversationId === conversationId) {
        const nextActive = remaining[0] ?? null;
        setActiveConversationId(nextActive?.id ?? null);
        setMessages(nextActive?.messages ?? []);
        persistConversations(remaining, nextActive?.id ?? null);
      } else persistConversations(remaining, activeConversationId);
      setConversations(remaining);
    },
    [activeConversationId, conversations, persistConversations],
  );

  const value = useMemo(
    () => ({
      messages,
      conversations,
      activeConversationId,
      ask,
      clearConversation,
      selectConversation,
      deleteConversation,
      open,
      setOpen,
      pending,
      error,
      retryQuestion,
      ready,
    }),
    [
      ask,
      activeConversationId,
      clearConversation,
      conversations,
      deleteConversation,
      error,
      messages,
      open,
      pending,
      ready,
      retryQuestion,
      selectConversation,
    ],
  );
  return (
    <SharedAskContext.Provider value={value}>
      {children}
    </SharedAskContext.Provider>
  );
}

function titleFromQuestion(question: string): string {
  return question.length > 58
    ? `${question.slice(0, 57).trimEnd()}…`
    : question;
}

function conversationTitle(messages: readonly SharedAskMessage[]): string {
  const firstQuestion = messages.find((message) => message.role === "user");
  return firstQuestion
    ? titleFromQuestion(firstQuestion.content)
    : "New conversation";
}

function conversationFromMessages(
  messages: readonly SharedAskMessage[],
): SharedAskConversation {
  return {
    id: crypto.randomUUID(),
    title: conversationTitle(messages),
    updatedAt: new Date().toISOString(),
    messages,
  };
}

function normalizeConversations(value: unknown): SharedAskConversation[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((conversation) => {
      if (
        typeof conversation !== "object" ||
        conversation === null ||
        !("id" in conversation) ||
        typeof conversation.id !== "string" ||
        !("title" in conversation) ||
        typeof conversation.title !== "string" ||
        !("updatedAt" in conversation) ||
        typeof conversation.updatedAt !== "string" ||
        !("messages" in conversation)
      )
        return [];
      const normalizedMessages = normalizeMessages(conversation.messages);
      if (!normalizedMessages.length) return [];
      return [
        {
          id: conversation.id,
          title: conversation.title.slice(0, 80),
          updatedAt: conversation.updatedAt,
          messages: normalizedMessages,
        },
      ];
    })
    .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 20);
}

export function useSharedAsk() {
  const context = useContext(SharedAskContext);
  if (!context)
    throw new Error("useSharedAsk must be used inside SharedAskProvider.");
  return context;
}

export function getAskSightlineErrorMessage(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : "";
  if (/too many questions/i.test(message)) return message;
  if (/does not permit access|not authorized|unauthorized/i.test(message))
    return "Your current role does not permit access to that information.";
  return "Sightline couldn't prepare an answer from the available records. Please retry, or narrow the project scope if the issue continues.";
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
