"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { ChatMenu, type ChatMenuState } from "./ChatMenu";
import { EmojiPicker } from "./EmojiPicker";
import type { ChatConversation, ChatMessage } from "./shared";
import { dayKey, fmtClock, fmtDayLabel, lastSeenLabel, roleLabel } from "./shared";

export type MenuAction =
  | { type: "pin"; value: boolean }
  | { type: "archive"; value: boolean }
  | { type: "mute"; preset: "1h" | "8h" | "2d" | "forever" | "off" }
  | { type: "clear" }
  | { type: "clearForEveryone" }
  | { type: "delete" }
  | { type: "block"; value: boolean }
  | { type: "report" }
  | { type: "search" };

type Props = {
  conversation: ChatConversation | null;
  currentUserId: string;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  onSend: (body: string) => Promise<boolean>;
  onBack: () => void;
  onStartCall?: (conversationId: string) => void;
  callBusy?: boolean;
  /** Telegram uslubidagi suhbat menyusi (mahkamlash, arxiv, blok ...). */
  menuState?: ChatMenuState;
  onMenuAction?: (action: MenuAction) => Promise<void> | void;
  blocked?: boolean;
  blockedByThem?: boolean;
};

export function MessageThread({
  conversation,
  currentUserId,
  messages,
  loading,
  sending,
  onSend,
  onBack,
  onStartCall,
  callBusy,
  menuState,
  onMenuAction,
  blocked,
  blockedByThem,
}: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const conversationId = conversation?.id ?? null;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, conversationId]);

  const groups = useMemo(() => {
    const result: { key: string; label: string; items: ChatMessage[] }[] = [];
    for (const message of messages) {
      const key = dayKey(message.createdAt);
      const last = result[result.length - 1];
      if (last && last.key === key) {
        last.items.push(message);
      } else {
        result.push({ key, label: fmtDayLabel(message.createdAt, t), items: [message] });
      }
    }
    return result;
  }, [messages, t]);

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    const ok = await onSend(text);
    if (ok) {
      setDraft("");
      setError(null);
    } else {
      setError(t("msgSendError"));
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  if (!conversation) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="animate-fade-up">
          <EmptyState
            title={t("msgNoConversationSelected")}
            description={t("msgNoConversationSelectedDesc")}
          />
        </div>
      </div>
    );
  }

  const participant = conversation.participant;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("msgBackToConversations")}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-900 md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={t("msgMenu")}
          aria-expanded={menuOpen}
          data-chat-header=""
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <Avatar name={participant.name} src={participant.avatarUrl} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-950">{participant.name}</p>
            <p className="truncate text-xs text-slate-500" data-last-seen="">
              {lastSeenLabel(participant.lastSeenAt, t)}
            </p>
          </div>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {/* Qidirish */}
          <button
            type="button"
            onClick={() => onMenuAction?.({ type: "search" })}
            aria-label={t("msgSearchInChat")}
            title={t("msgSearchInChat")}
            data-chat-search=""
            className="relative inline-flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 after:absolute after:-inset-1 after:content-[''] hover:bg-slate-100 hover:text-brand-900"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>

          {/* Ovozli qo'ng'iroq */}
          <button
            type="button"
            onClick={() => onStartCall?.(conversation.id)}
            disabled={callBusy}
            aria-label={t("callStart")}
            title={t("callStart")}
            data-audio-call=""
            className="relative inline-flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 after:absolute after:-inset-1 after:content-[''] hover:bg-slate-100 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.4 21 3 13.6 3 4.5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.7z" />
            </svg>
          </button>

          {/* Video qo'ng'iroq */}
          <button
            type="button"
            onClick={() => onStartCall?.(conversation.id)}
            disabled={callBusy}
            aria-label={t("callStart")}
            title={t("callStart")}
            data-call-start=""
            className="relative inline-flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 after:absolute after:-inset-1 after:content-[''] hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m16 10 4.6-2.3A1 1 0 0 1 22 8.6v6.8a1 1 0 0 1-1.4.9L16 14" />
              <rect x="2" y="6" width="14" height="12" rx="2" />
            </svg>
          </button>

          {/* Menyular */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("msgMenu")}
            aria-expanded={menuOpen}
            title={t("msgMenu")}
            data-chat-menu-toggle=""
            className="relative inline-flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 after:absolute after:-inset-1 after:content-[''] hover:bg-slate-100 hover:text-brand-900"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="12" cy="19" r="1.7" />
            </svg>
          </button>
        </div>
      </div>

      {menuState && onMenuAction ? (
        <ChatMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          state={menuState}
          partnerName={participant.name}
          onPin={(value) => onMenuAction({ type: "pin", value })}
          onArchive={(value) => onMenuAction({ type: "archive", value })}
          onMute={(preset) => onMenuAction({ type: "mute", preset })}
          onClearHistory={() => onMenuAction({ type: "clear" })}
          onClearForEveryone={() => onMenuAction({ type: "clearForEveryone" })}
          onDeleteChat={() => onMenuAction({ type: "delete" })}
          onBlock={(value) => onMenuAction({ type: "block", value })}
          onReport={() => onMenuAction({ type: "report" })}
          onSearch={() => onMenuAction({ type: "search" })}
        />
      ) : null}

      <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onPick={(emoji) => setDraft((d) => d + emoji)}
      />

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/80 via-white to-white px-4 py-4"
      >
        {loading && messages.length === 0 ? (
          <div className="animate-fade-up space-y-4 py-2">
            <Skeleton className="mx-auto h-6 w-20 rounded-full" />
            <div className="flex justify-start">
              <Skeleton className="h-16 w-52 rounded-3xl rounded-bl-lg" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-40 rounded-3xl rounded-br-lg" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-24 w-60 rounded-3xl rounded-bl-lg" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-fade-up">
              <EmptyState
                title={t("msgNoMessages")}
                description={t("msgStartFirstMessage")}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.key} className="space-y-3">
                <div className="sticky top-0 z-10 flex justify-center py-1">
                  <span className="rounded-full border border-slate-200/70 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur">
                    {group.label}
                  </span>
                </div>
                {group.items.map((message, index) => {
                  const own = message.senderId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex animate-fade-up", own ? "justify-end" : "justify-start")}
                      style={{ animationDelay: `${Math.min(index, 6) * 24}ms` }}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-3xl px-4 py-2.5 sm:max-w-[70%]",
                          own
                            ? "rounded-br-lg bg-gradient-to-br from-brand-800 to-brand-950 text-white shadow-[0_8px_20px_-12px_rgba(19,31,60,0.75)]"
                            : "rounded-bl-lg border border-slate-200/70 bg-white text-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_24px_-16px_rgba(29,52,96,0.45)]",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.body}
                        </p>
                        <span
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 text-[11px]",
                            own ? "text-brand-200" : "text-slate-600",
                          )}
                        >
                          {fmtClock(message.createdAt)}
                          {own ? (
                            message.isRead ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-brand-200">
                                <path d="M18 6 7 17l-5-5" />
                                <path d="m22 10-7.5 7.5L13 16" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-brand-300/80">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            )
                          ) : null}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
        {error ? <p className="mb-2 px-1 text-xs text-rose-600">{error}</p> : null}
        {blocked ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            {blockedByThem ? t("msgBlockedByThem") : t("msgYouBlockedThem")}
          </p>
        ) : (
        <div className="flex items-end gap-1.5 rounded-3xl border border-slate-200 bg-white p-1.5 pl-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10">
          <button
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            aria-label={t("msgEmoji")}
            aria-expanded={emojiOpen}
            data-emoji-toggle=""
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-700"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 14.5s1.2 1.8 3.5 1.8 3.5-1.8 3.5-1.8" />
              <path d="M9 9.5h.01M15 9.5h.01" />
            </svg>
          </button>
          <textarea
            rows={1}
            value={draft}
            maxLength={2000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("msgComposePlaceholder")}
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={sending || draft.trim().length === 0}
            aria-label={t("msgSend")}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-800 to-brand-950 text-white shadow-sm transition-[--tw-gradient-from,--tw-gradient-to,opacity] duration-150 hover:from-brand-700 hover:to-brand-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
        )}
        <p className="mt-2 hidden px-2 text-[11px] text-slate-600 sm:block">
          {t("msgComposerHint")}
        </p>
      </div>
    </div>
  );
}
