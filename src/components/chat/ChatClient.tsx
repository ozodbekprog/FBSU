"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ConversationList, type BlockedUser } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { useCallSignaling } from "./useCallSignaling";
import { VideoCallOverlay } from "./VideoCallOverlay";
import type { MenuAction } from "./MessageThread";
import type { ChatConversation, ChatMessage } from "./shared";

type ConversationsResponse = { ok: boolean; data?: { conversations: ChatConversation[] } };
type ConversationResponse = { ok: boolean; data?: { conversation: ChatConversation } };
type MessagesResponse = { ok: boolean; data?: { messages: ChatMessage[] } };
type MessageResponse = { ok: boolean; data?: { message: ChatMessage } };
type BlockedResponse = { ok: boolean; data?: { blockedUsers: BlockedUser[] } };

const POLL_MS = 5000;

type Props = {
  currentUserId: string;
  initialUserId?: string;
};

export function ChatClient({ currentUserId, initialUserId }: Props) {
  const call = useCallSignaling(currentUserId);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [archived, setArchived] = useState<ChatConversation[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
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
      const [activeRes, archivedRes, blockedRes] = await Promise.all([
        fetch("/api/chat/conversations", { cache: "no-store" }),
        fetch("/api/chat/conversations?archived=1", { cache: "no-store" }),
        fetch("/api/chat/block", { cache: "no-store" }),
      ]);
      const activeJson = (await activeRes.json().catch(() => null)) as ConversationsResponse | null;
      const archivedJson = (await archivedRes.json().catch(() => null)) as ConversationsResponse | null;
      const blockedJson = (await blockedRes.json().catch(() => null)) as BlockedResponse | null;
      if (activeRes.ok && activeJson?.ok && activeJson.data) {
        setConversations(activeJson.data.conversations);
      }
      if (archivedRes.ok && archivedJson?.ok && archivedJson.data) {
        setArchived(archivedJson.data.conversations);
      }
      if (blockedRes.ok && blockedJson?.ok && blockedJson.data) {
        setBlockedUsers(blockedJson.data.blockedUsers);
      }
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
    async (body: string, type?: "VOICE", base64Audio?: string, durationSec?: number, replyToId?: string) => {
      if (!activeId) return false;
      setSending(true);
      try {
        const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, type, base64Audio, durationSec, replyToId }),
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

  const sendFile = useCallback(
    async (payload: { base64: string; mimeType: string; fileName: string; replyToId?: string }) => {
      if (!activeId) return false;
      setSending(true);
      try {
        const res = await fetch(`/api/chat/conversations/${activeId}/file`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => null)) as MessageResponse | null;
        if (!res.ok || !json?.ok) return false;
        await loadMessages(activeId);
        void refreshConversations();
        return true;
      } catch {
        return false;
      } finally {
        setSending(false);
      }
    },
    [activeId, loadMessages, refreshConversations],
  );

  const sendVoice = useCallback(
    async (payload: { base64: string; durationSec: number; mimeType: string; replyToId?: string }) => {
      if (!activeId) return false;
      setSending(true);
      try {
        const res = await fetch(`/api/chat/conversations/${activeId}/voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: payload.base64,
            mimeType: payload.mimeType,
            durationSec: payload.durationSec,
            replyToId: payload.replyToId,
          }),
        });
        const json = (await res.json().catch(() => null)) as MessageResponse | null;
        if (!res.ok || !json?.ok) return false;
        await loadMessages(activeId);
        void refreshConversations();
        return true;
      } catch {
        return false;
      } finally {
        setSending(false);
      }
    },
    [activeId, loadMessages, refreshConversations],
  );

  const editMessage = useCallback(
    async (messageId: string, body: string) => {
      if (!activeId) return false;
      setSending(true);
      try {
        const res = await fetch(`/api/chat/conversations/${activeId}/messages/${messageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        const json = (await res.json().catch(() => null)) as MessageResponse | null;
        if (!res.ok || !json?.ok) return false;
        // Tahrirlangan xabarni ro'yxatda yangilaymiz.
        const updated = (json.data as { message?: ChatMessage } | undefined)?.message;
        setMessageData((prev) =>
          prev && prev.conversationId === activeId
            ? {
                conversationId: activeId,
                items: prev.items.map((m) => (m.id === messageId && updated ? { ...m, ...updated } : m)),
              }
            : prev,
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

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!activeId) return false;
      try {
        const res = await fetch(`/api/chat/conversations/${activeId}/messages/${messageId}`, {
          method: "DELETE",
        });
        const json = (await res.json().catch(() => null)) as { ok: boolean } | null;
        if (!res.ok || !json?.ok) return false;
        // O'chirilgan xabarni ro'yxatda "o'chirildi" deb belgilaymiz.
        setMessageData((prev) =>
          prev && prev.conversationId === activeId
            ? {
                conversationId: activeId,
                items: prev.items.map((m) =>
                  m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), body: "" } : m,
                ),
              }
            : prev,
        );
        return true;
      } catch {
        return false;
      }
    },
    [activeId],
  );

  const activeConversation =
    [...conversations, ...archived].find((item) => item.id === activeId) ?? null;
  const messages =
    messageData && messageData.conversationId === activeId ? messageData.items : [];
  const loadingMessages = activeId !== null && messageData?.conversationId !== activeId;

  // Qo'ng'iroq tugagach xabarlar oqimini darhol yangilaymiz — qo'ng'iroq
  // tarixi (javob holati va davomiyligi) 5 soniyalik pollni kutmasin.
  const callPhase = call.phase;
  const prevCallPhase = useRef(callPhase);
  useEffect(() => {
    const prev = prevCallPhase.current;
    prevCallPhase.current = callPhase;
    if (prev !== "idle" && callPhase === "idle" && activeId) {
      void loadMessages(activeId);
    }
  }, [callPhase, activeId, loadMessages]);

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
          if (res?.ok) {
            patchMenuState(activeId, { blocked: action.value });
            // Bloklanganlar navbari darhol yangilansin.
            void refreshConversations();
          }
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

  // Bloklanganlar navbaridan foydalanuvchini blokdan chiqarish.
  const unblockUser = useCallback(
    async (conversationId: string) => {
      const res = await fetch("/api/chat/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, blocked: false }),
      })
        .then((r) => r.json().catch(() => null))
        .catch(() => null);
      if (res?.ok) {
        setBlockedUsers((prev) => prev.filter((u) => u.conversationId !== conversationId));
        patchMenuState(conversationId, { blocked: false });
        void refreshConversations();
        return true;
      }
      return false;
    },
    [patchMenuState, refreshConversations],
  );

  return (
    /* Balandlik `100dvh` dan olinadi, `100vh` dan emas:
     telefonda `100vh` brauzer panelini (URL/panel tugmalari) ham
     hisobga oladi va yashirilganda/qaytanda o'zgaradi — foydalanuvchi
     karta pastini ko'rmasligi yoki chetlab ketishi mumkin edi.
     `dvh` esa har doim KO'RINADIGAN maydonni beradi, shuning uchun
     telefon brauzeri yoki bosh boshqa qurilmada kattalashtirish
     (pinch-zoom / +-) qilinganda ham panel joyida qoladi.
     `min-h` esa kichik ekranlarda ekranga sig'sin, kattalarida 480px.
     Bo'shliq `_` bilan yozilgan — Tailwind uni `calc(100dvh - 15rem)`
     ga aylantiradi (aniq va boshqa vositalarda ham to'g'ri o'qiladi). */
    <Card className="flex h-[calc(100dvh_-_15rem)] min-h-[60vh] animate-fade-up overflow-hidden sm:min-h-[480px] md:h-full md:min-h-0 md:rounded-none md:border-0 md:shadow-none">
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
          archived={archived}
          blockedUsers={blockedUsers}
          onUnblock={unblockUser}
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
          onSendFile={sendFile}
          onSendVoice={sendVoice}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          onBack={() => setActiveId(null)}
          onStartCall={(conversationId, mode) => {
            const p = activeConversation?.participant;
            void call.start(
              conversationId,
              mode === "video",
              p ? { id: p.id, name: p.name, avatarUrl: p.avatarUrl, role: p.role } : undefined,
            );
          }}
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
