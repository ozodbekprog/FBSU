"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, EmptyState, Skeleton } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { ChatMenu, type ChatMenuState } from "./ChatMenu";
import { ChatSearch } from "./ChatSearch";
import { EmojiPicker } from "./EmojiPicker";
import { MessageBubble } from "./MessageBubble";
import type { ChatConversation, ChatMessage } from "./shared";
import { dayKey, fmtDayLabel, lastSeenLabel } from "./shared";
import { useVoiceRecorder } from "@/lib/voice-recorder";

const MENU_FALLBACK: ChatMenuState = { pinned: false, archived: false, muted: false, blocked: false };

export type MenuAction =
  | { type: "pin"; value: boolean }
  | { type: "archive"; value: boolean }
  | { type: "mute"; preset: "1h" | "8h" | "2d" | "forever" | "off" }
  | { type: "clear" }
  | { type: "clearForEveryone" }
  | { type: "delete" }
  | { type: "block"; value: boolean }
  | { type: "search" };

type Props = {
  conversation: ChatConversation | null;
  currentUserId: string;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  onSend: (body: string, type?: "VOICE", base64Audio?: string, durationSec?: number, replyToId?: string) => Promise<boolean>;
  /** Fayl yoki rasm yuklash (paperclip / image tugmalari). */
  onSendFile?: (payload: { base64: string; mimeType: string; fileName: string; replyToId?: string }) => Promise<boolean>;
  /** Yozib olingan ovozni yuborish (mikrofon). */
  onSendVoice?: (payload: { base64: string; durationSec: number; mimeType: string; replyToId?: string }) => Promise<boolean>;
  /** Xabarni tahrirlash. */
  onEditMessage?: (messageId: string, body: string) => Promise<boolean>;
  /** Xabarni o'chirish. */
  onDeleteMessage?: (messageId: string) => Promise<boolean>;
  onBack: () => void;
  onStartCall?: (conversationId: string, mode: "audio" | "video") => void;
  callBusy?: boolean;
  /** Telegram uslubidagi suhbat menyusi (mahkamlash, arxiv, blok ...). */
  menuState?: ChatMenuState;
  menuNotice?: string | null;
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
  onSendFile,
  onSendVoice,
  onEditMessage,
  onDeleteMessage,
  onBack,
  onStartCall,
  callBusy,
  menuState,
  menuNotice,
  onMenuAction,
  blocked,
  blockedByThem,
}: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const voiceRecorder = useVoiceRecorder();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const chatMenuBtnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationId = conversation?.id ?? null;
  const runAction = onMenuAction ?? (async () => {});
  const MAX_FILE_MB = 5;

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  /** Qidiruvdan topilgan xabarni ko'rsatadi va biroz ajratib qo'yadi. */
  function jumpToMessage(messageId: string) {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
    if (!node) return;
    node.scrollIntoView({ block: "center", behavior: "smooth" });
    node.classList.add("rounded-2xl", "ring-2", "ring-brand-400");
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      node.classList.remove("rounded-2xl", "ring-2", "ring-brand-400");
      highlightTimerRef.current = null;
    }, 1500);
  }

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Foydalanuvchi tarixni ko'rish uchun yuqoriga chiqqan bo'lsa (5
    // soniyalik poll har safar buni ishga tushirardi) majburlab pastga
    // tortib qo'ymaymiz — faqat allaqachon pastdagi yaqin turgan bo'lsak
    // avtomatik pastga tushiramiz.
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom) el.scrollTop = el.scrollHeight;
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
    // Tahrirlash rejimi — xabarni yangilaymiz.
    if (editing) {
      const ok = (await onEditMessage?.(editing.id, text)) ?? false;
      if (ok) {
        setEditing(null);
        setDraft("");
        setError(null);
      } else {
        setError(t("msgSendError"));
      }
      return;
    }
    const ok = await onSend(text, undefined, undefined, undefined, replyTo?.id);
    if (ok) {
      setDraft("");
      setReplyTo(null);
      setError(null);
    } else {
      setError(t("msgSendError"));
    }
  }

  function startReply(message: ChatMessage) {
    setEditing(null);
    setReplyTo(message);
  }

  function startEdit(message: ChatMessage) {
    setReplyTo(null);
    setEditing(message);
    setDraft(message.body);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = (await onDeleteMessage?.(deleteTarget.id)) ?? false;
      if (ok) {
        if (editing?.id === deleteTarget.id) {
          setEditing(null);
          setDraft("");
        }
        setDeleteTarget(null);
      } else {
        setError(t("msgSendError"));
      }
    } finally {
      setDeleting(false);
    }
  }

  /** Faylni base64'ga o'girib yuboradi (paperclip / image). */
  async function sendFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(t("msgFileTooLarge"));
      return;
    }
    if (!onSendFile) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string | null>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }).catch(() => null);
      if (!base64) {
        setError(t("msgSendError"));
        return;
      }
      const ok = await onSendFile({
        base64,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        replyToId: replyTo?.id,
      });
      if (ok) {
        setError(null);
        setReplyTo(null);
      } else {
        setError(t("msgSendError"));
      }
    } finally {
      setUploading(false);
    }
  }

  async function startVoice() {
    setError(null);
    try {
      await voiceRecorder.startRecording();
    } catch {
      setError(t("msgSendError"));
    }
  }

  async function stopVoiceAndSend() {
    const recorded = await voiceRecorder.stopRecording();
    if (!recorded) return;
    if (!onSendVoice) return;
    const ok = await onSendVoice({
      base64: recorded.base64,
      durationSec: recorded.durationSec,
      mimeType: recorded.mimeType,
      replyToId: replyTo?.id,
    });
    if (!ok) setError(t("msgSendError"));
    else setReplyTo(null);
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
            <p className="truncate text-sm font-semibold text-brand-950">{participant.name} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><circle cx="12" cy="12" r="5"/><path d="M21 15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/><circle cx="12" cy="12" r="4"/><path d="M21 3l-1-1l-3-3M10 7l1 1l1 3"/></svg></p>            <p className="truncate text-xs text-slate-500" data-last-seen="">
              {lastSeenLabel(participant.lastSeenAt, t)}
            </p>
          </div>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {/* Qidirish */}
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={t("msgSearchInChat")}
            title={t("msgSearchInChat")}
            aria-expanded={searchOpen}
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
            onClick={() => onStartCall?.(conversation.id, "audio")}
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
            onClick={() => onStartCall?.(conversation.id, "video")}
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
            ref={chatMenuBtnRef}
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

      <ChatMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        state={menuState ?? MENU_FALLBACK}
        partnerName={participant.name}
        onPin={async (value) => {
          await runAction({ type: "pin", value });
        }}
        onArchive={async (value) => {
          await runAction({ type: "archive", value });
        }}
        onMute={async (preset) => {
          await runAction({ type: "mute", preset });
        }}
        onClearHistory={async () => {
          await runAction({ type: "clear" });
        }}
        onClearForEveryone={async () => {
          await runAction({ type: "clearForEveryone" });
        }}
        onDeleteChat={async () => {
          await runAction({ type: "delete" });
        }}
        onBlock={async (value) => {
          await runAction({ type: "block", value });
        }}
        onSearch={() => setSearchOpen(true)}
        anchorRef={chatMenuBtnRef}
      />

      <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onPick={(emoji) => setDraft((d) => d + emoji)}
        anchorRef={emojiBtnRef}
      />

      <ChatSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        messages={messages}
        currentUserId={currentUserId}
        onSelect={jumpToMessage}
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
                {group.items.map((message) => (
                  <div key={message.id} data-message-id={message.id}>
                    <MessageBubble
                      message={message}
                      own={message.senderId === currentUserId}
                      currentUserId={currentUserId}
                      onReply={startReply}
                      onEdit={startEdit}
                      onDelete={(m) => setDeleteTarget(m)}
                      onCallBack={
                        onStartCall && conversation
                          ? (media) => onStartCall(conversation.id, media === "AUDIO" ? "audio" : "video")
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
        {error ? <p className="mb-2 px-1 text-xs text-rose-600">{error}</p> : null}
        {menuNotice ? (
          <p data-menu-notice="" className="mb-2 px-1 text-xs text-rose-600">
            {menuNotice}
          </p>
        ) : null}

        {(replyTo || editing) && !blocked ? (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-800/50 dark:bg-brand-950/50">
            <span className="min-w-0 flex-1 text-xs text-brand-800 dark:text-brand-200">
              <span className="font-semibold">{editing ? t("msgEdit") : t("msgReply")}:</span>{" "}
              <span className="opacity-80">
                {editing
                  ? editing.body
                  : replyTo?.body || (replyTo?.attachments?.length ? "📎" : "")}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setReplyTo(null);
                setDraft("");
              }}
              aria-label={t("commonCancel")}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-900/40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
        ) : null}

        {blocked ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            {blockedByThem ? t("msgBlockedByThem") : t("msgYouBlockedThem")}
          </p>
        ) : voiceRecorder.isRecording ? (
          <div className="flex items-center gap-2 rounded-3xl border border-rose-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <button
              type="button"
              onClick={() => voiceRecorder.cancelRecording()}
              aria-label={t("msgRecordingCancel")}
              title={t("msgRecordingCancel")}
              data-voice-cancel=""
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-rose-500 transition-colors hover:bg-rose-50"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 14h10l1-14" />
              </svg>
            </button>
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
            <span className="text-sm font-semibold tabular-nums text-slate-700">
              {Math.floor(voiceRecorder.audioDuration / 60)}:{String(voiceRecorder.audioDuration % 60).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
              {t("msgRecordingCancel")}
            </span>
            <button
              type="button"
              onClick={() => void stopVoiceAndSend()}
              aria-label={t("msgSend")}
              data-voice-send=""
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition-colors hover:bg-rose-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {/* Paperclip — fayl biriktirish */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label={t("msgAttachFile")}
              title={t("msgAttachFile")}
              data-attach-file=""
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* Xabar maydoni (pill) — ichida emoji va rasm */}
            <div className="flex min-w-0 flex-1 items-end gap-0.5 rounded-3xl border border-slate-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10">
              <textarea
                rows={1}
                value={draft}
                maxLength={2000}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("msgComposePlaceholder")}
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                ref={emojiBtnRef}
                onClick={() => setEmojiOpen((v) => !v)}
                aria-label={t("msgEmoji")}
                aria-expanded={emojiOpen}
                title={t("msgEmoji")}
                data-emoji-toggle=""
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-700"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8.5 14.5s1.2 1.8 3.5 1.8 3.5-1.8 3.5-1.8" />
                  <path d="M9 9.5h.01M15 9.5h.01" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                aria-label={t("msgAttachImage")}
                title={t("msgAttachImage")}
                data-attach-image=""
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-4.5-4.5L3.5 21" />
                </svg>
              </button>
            </div>

            {/* Mikrofon (bo'sh) yoki Yuborish (matn bor) */}
            {draft.trim() ? (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={sending || uploading}
                aria-label={t("msgSend")}
                title={t("msgSend")}
                data-send-button=""
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-800 to-brand-950 text-white shadow-sm transition-[--tw-gradient-from,--tw-gradient-to,opacity] duration-150 hover:from-brand-700 hover:to-brand-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startVoice()}
                disabled={uploading}
                aria-label={t("msgVoiceRecord")}
                title={t("msgVoiceRecord")}
                data-voice-toggle=""
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-800 to-brand-950 text-white shadow-[0_8px_20px_-8px_rgba(19,31,60,0.55)] transition-transform duration-150 hover:from-brand-700 hover:to-brand-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                  <path d="M12 18v4" />
                </svg>
              </button>
            )}
          </div>
        )}
        {/* Yashirin fayl/rasm inputlari */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          data-file-input=""
          onChange={(event) => {
            void sendFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-image-input=""
          onChange={(event) => {
            void sendFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <p className="mt-2 hidden px-2 text-[11px] text-slate-600 sm:block">
          {t("msgComposerHint")}
        </p>
      </div>

      {/* O'chirish tasdiqi */}
      {deleteTarget && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/50" onClick={() => !deleting && setDeleteTarget(null)} />
              <div
                role="dialog"
                aria-modal="true"
                data-delete-confirm=""
                className="animate-fade-up relative w-full max-w-xs rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xl dark:border-slate-200/30 dark:bg-[#0e1729]"
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t("msgConfirmDeleteMessage")}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-200"
                  >
                    {t("commonCancel")}
                  </button>
                  <button
                    type="button"
                    data-delete-ok=""
                    onClick={() => void confirmDelete()}
                    disabled={deleting}
                    className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                  >
                    {t("msgDelete")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
