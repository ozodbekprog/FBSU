"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { useCallSignaling } from "./useCallSignaling";
import { VideoCallOverlay } from "./VideoCallOverlay";
import type { MenuAction } from "./MessageThread";
import type { ChatConversation, ChatMessage } from "./shared";

type ConversationsResponse = { ok: boolean; data?: { conversations: ChatConversation[] } };
type ConversationResponse = { ok: boolean; data?: { conversation: ChatConversation } };
type MessagesResponse = { ok: boolean; data?: { messages: ChatMessage[] } };
type MessageResponse = { ok: boolean; data?: { message: ChatMessage } };

const POLL_MS = 5000;

type Props = {
  currentUserId: string;
  initialUserId?: string;
};

export function ChatClient({ currentUserId, initialUserId }: Props) {
  const call = useCallSignaling(currentUserId);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  // Telegram uslubidagi suhbat menyusi holati (mahkamlash, arxiv, ...)
  const [menuState, setMenuState] = useState<
    Record<
      string,
      {
        pinned: boolean;
        archived: boolean;
        muted: boolean;
        blocked: boolean;
        blockedByThem?: boolean;
      }
    >
  >({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messageData, setMessageData] = useState<{
    conversationId: string;
    items: ChatMessage[];
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const openedInitial = useRef(false);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ConversationsResponse | null;
      if (res.ok && json?.ok && json.data) setConversations(json.data.conversations);
    } catch {
      return;
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      try {
        const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as MessagesResponse | null;
        if (!res.ok || !json?.ok || !json.data) return;
        const incoming = json.data.messages;
        setMessageData((prev) => {
          if (prev && prev.conversationId === conversationId) {
            const lastPrev = prev.items[prev.items.length - 1]?.id;
            const lastIncoming = incoming[incoming.length - 1]?.id;
            if (prev.items.length === incoming.length && lastPrev === lastIncoming) return prev;
          }
          return { conversationId, items: incoming };
        });
        void refreshConversations();
      } catch {
        return;
      }
    },
    [refreshConversations],
  );

  useEffect(() => {
    void Promise.resolve().then(refreshConversations);
    const timer = setInterval(() => {
      void refreshConversations();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeId) return;
    void Promise.resolve().then(() => loadMessages(activeId));
    const timer = setInterval(() => {
      void loadMessages(activeId);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [activeId, loadMessages]);

  const openConversation = useCallback(
    async (userId: string) => {
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const json = (await res.json().catch(() => null)) as ConversationResponse | null;
        if (!res.ok || !json?.ok || !json.data) return false;
        const conversation = json.data.conversation;
        setConversations((prev) =>
          prev.some((item) => item.id === conversation.id) ? prev : [conversation, ...prev],
        );
        setActiveId(conversation.id);
        void refreshConversations();
        return true;
      } catch {
        return false;
      }
    },
    [refreshConversations],
  );

  useEffect(() => {
    if (!initialUserId || openedInitial.current) return;
    openedInitial.current = true;
    void openConversation(initialUserId);
  }, [initialUserId, openConversation]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!activeId) return false;
      setSending(true);
      try {
        const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        const json = (await res.json().catch(() => null)) as MessageResponse | null;
        const message = json?.data?.message;
        if (!res.ok || !json?.ok || !message) return false;
        setMessageData((prev) =>
          prev && prev.conversationId === activeId
            ? { conversationId: activeId, items: [...prev.items, message] }
            : { conversationId: activeId, items: [message] },
        );
        void refreshConversations();
        return true;
      } catch {
        return false;
      } finally {
        setSending(false);
      }
    },
    [activeId, refreshConversations],
  );

  const activeConversation = conversations.find((item) => item.id === activeId) ?? null;
  const messages =
    messageData && messageData.conversationId === activeId ? messageData.items : [];
  const loadingMessages = activeId !== null && messageData?.conversationId !== activeId;

  /** Bloklash/arkiv/mahkam — faqat joriy suhbat uchun. */
  const patchMenuState = useCallback(
    (conversationId: string, patch: Partial<(typeof menuState)[string]>) => {
      const fallback = { pinned: false, archived: false, muted: false, blocked: false };
      setMenuState((prev) => ({
        ...prev,
        [conversationId]: { ...fallback, ...(prev[conversationId] ?? {}), ...patch },
      }));
    },
    [],
  );

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/chat/conversations/${activeId}`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      if (cancelled || !res?.ok) return;
      patchMenuState(activeId, {
        pinned: !!res.data.pinned,
        archived: !!res.data.archived,
        muted: !!res.data.muted,
        blocked: !!res.data.blocked,
        blockedByThem: !!res.data.blockedByThem,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, patchMenuState]);

  const menuAction = useCallback(
    async (action: MenuAction) => {
      if (!activeId) return;
      const base = `/api/chat/conversations/${activeId}`;
      const json = async (url: string, init?: RequestInit) =>
        fetch(url, init).then((r) => r.json().catch(() => null)).catch(() => null);

      switch (action.type) {
        case "pin": {
          const res = await json(base, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pinned: action.value }),
          });
          if (res?.ok) patchMenuState(activeId, { pinned: action.value });
          break;
        }
        case "archive": {
          const res = await json(base, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: action.value }),
          });
          if (res?.ok) {
            patchMenuState(activeId, { archived: action.value });
            // arxivga o'tkazilgan suhbat ro'yxatdan chiqadi
            if (action.value) setActiveId(null);
            void refreshConversations();
          }
          break;
        }
        case "mute": {
          const res = await json(base, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mute: action.preset }),
          });
          if (res?.ok) patchMenuState(activeId, { muted: action.preset !== "off" });
          break;
        }
        case "clear":
        case "clearForEveryone": {
          const url =
            action.type === "clear" ? `${base}/clear` : `${base}/clear-for-everyone`;
          const res = await json(url, { method: "POST" });
          if (res?.ok) {
            setMessageData(
              action.type === "clear"
                ? { conversationId: activeId, items: [] }
                : null,
            );
            void refreshConversations();
          }
          break;
        }
        case "delete": {
          const res = await json(base, { method: "DELETE" });
          if (res?.ok) {
            setActiveId(null);
            setMessageData(null);
            void refreshConversations();
          }
          break;
        }
        case "block": {
          const res = await json("/api/chat/block", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: activeId, blocked: action.value }),
          });
          if (res?.ok) patchMenuState(activeId, { blocked: action.value });
          break;
        }
        case "report": {
          await json("/api/chat/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: activeId,
              reason: "abuse",
              note: "Suhbat menyusidan yuborilgan shikoyat",
            }),
          });
          break;
        }
        case "search":
          // qidiruv maydoniga fokus — alohida komponent emas
          document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
          break;
      }
    },
    [activeId, patchMenuState, refreshConversations],
  );

  return (
    <Card className="flex h-[calc(100vh-15rem)] min-h-[480px] animate-fade-up overflow-hidden md:h-full md:min-h-0 md:rounded-none md:border-0 md:shadow-none">
      <div
        className={cn(
          // md (768–1023px) da sidebar 256px ni yeb ketadi va kartada
          // ikki panel uchun joy qolmaydi — o'ng panelning bo'sh holati
          // kartadan tashqariga toshib ketardi. Shuning uchun md'da
          // ro'yxat to'liq kenglikda, o'ng panel faqat lg'dan boshlab.
          "w-full flex-col border-slate-100 md:flex lg:w-80 lg:border-r xl:w-96",
          activeId ? "hidden" : "flex",
        )}
      >
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          currentUserId={currentUserId}
          loading={!loaded}
          onSelect={setActiveId}
          onStartConversation={openConversation}
        />
      </div>
      <div className={cn("min-w-0 flex-1", activeId ? "flex" : "hidden lg:flex")}>
        <MessageThread
          key={activeId ?? "empty"}
          conversation={activeConversation}
          currentUserId={currentUserId}
          messages={messages}
          loading={loadingMessages}
          sending={sending}
          onSend={sendMessage}
          onBack={() => setActiveId(null)}
          onStartCall={(conversationId) => void call.start(conversationId)}
          callBusy={call.phase !== "idle"}
          menuState={activeId ? menuState[activeId] : undefined}
          blocked={activeId ? menuState[activeId]?.blocked : false}
          blockedByThem={activeId ? menuState[activeId]?.blockedByThem : false}
          onMenuAction={(action) => menuAction(action)}
        />
      </div>
      <VideoCallOverlay call={call} />
    </Card>
  );
}
