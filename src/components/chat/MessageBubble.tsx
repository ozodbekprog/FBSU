"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MAX_RATE,
  MIN_RATE,
  RATE_PRESETS,
  RATE_STEP,
  formatRate,
  readStoredRate,
  storeRate,
} from "./voice-speed";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { ChatMessage } from "./shared";
import { fmtClock } from "./shared";

type Props = {
  message: ChatMessage;
  own: boolean;
  currentUserId: string;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageBubble({ message, own, currentUserId, onReply, onEdit, onDelete }: Props) {
  const { t } = useI18n();
  const isVoice = message.type === "VOICE";
  const isFile = message.type === "FILE";
  const isImage = isFile && message.attachments?.[0]?.kind === "IMAGE";
  const isForwarded = !!message.forwardedFromId;
  const isDeleted = !!message.deletedAt;
  const isEdited = !!message.editedAt;
  const [isPlaying, setIsPlaying] = useState(false);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  // Ovoz tezligi (Telegram uslubidagi boshqaruv). Boshlang'ich qiymat 1 —
  // saqlangan qiymat `play()` paytida `readStoredRate()` dan olinadi, shuning
  // uchun server va mijoz render'i bir xil bo'lib qoladi.
  const [rate, setRate] = useState(1);
  const [speedAt, setSpeedAt] = useState<{ x: number; y: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);
  const speedBtnRef = useRef<HTMLButtonElement>(null);

  const attachment = message.attachments?.[0];
  const rawUrl = attachment ? `/api/chat/attachments/${attachment.id}?raw=1` : null;
  const duration = attachment?.durationSec ?? 0;
  const durationLabel = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;
  const fileName = attachment?.fileName ?? message.body ?? "file";
  const replyTo = message.replyTo ?? null;

  function togglePlay() {
    if (!rawUrl) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(rawUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    } else {
      audioRef.current.src = rawUrl;
    }
    audioRef.current.playbackRate = readStoredRate();
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }

  /** Tezlikni o'zgartiradi va joriy ijroga darhol qo'llaydi. */
  function applyRate(next: number) {
    const safe = storeRate(next);
    setRate(safe);
    if (audioRef.current) audioRef.current.playbackRate = safe;
  }

  const closeMenu = useCallback(() => setMenuAt(null), []);

  // Menyu tashqariga bosilganda / Escape / scroll'da yopiladi.
  // Muhim: `pointerdown` CAPTURE fazasida turadi — agar shunda har doim
  // yopilsa, menyudagi tugma bosilganda ham menyu yopilib, `onClick`
  // hech qachon ishlamaydi. Shuning uchun faqat menyudan TASHQARIDA
  // bosilgandagina yopamiz.
  useEffect(() => {
    if (!menuAt) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu();
    const onDown = (e: Event) => {
      const node = menuRef.current;
      if (node && e.target instanceof Node && node.contains(e.target)) return;
      closeMenu();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onDown, true);
    window.addEventListener("resize", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onDown, true);
      window.removeEventListener("resize", onDown);
    };
  }, [menuAt, closeMenu]);

  function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuAt((prev) => (prev ? null : { x: e.clientX, y: e.clientY }));
  }

  return (
    <div className={cn("flex animate-fade-up relative group", own ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-3xl px-4 py-2.5 sm:max-w-[70%]",
          own
            ? "rounded-br-lg bg-gradient-to-br from-brand-800 to-brand-950 text-white shadow-[0_8px_20px_-12px_rgba(19,31,60,0.75)]"
            : "rounded-bl-lg border border-slate-200/70 bg-white text-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_24px_-16px_rgba(29,52,96,0.45)]",
        )}
        onContextMenu={isDeleted ? undefined : openMenu}
      >
        {isForwarded ? (
          <p className="text-[11px] opacity-70 mb-1 italic">Forwarded</p>
        ) : null}

        {replyTo ? (
          <div
            className={cn(
              "mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs",
              own ? "border-white/50 bg-black/15 text-brand-100" : "border-brand-400 bg-slate-100 text-slate-600",
            )}
          >
            <span className="mr-1 opacity-70">↩︎</span>
            <span className="line-clamp-2 break-words">
              {replyTo.senderId === currentUserId ? t("msgYouPrefix") : ""}
              {replyTo.body || "📎"}
            </span>
          </div>
        ) : null}

        {isDeleted ? (
          <p className={cn("text-sm italic opacity-60", own ? "text-brand-200" : "text-slate-400")}>
            🚫 {t("msgDeletedMessage")}
          </p>
        ) : isVoice ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                own ? "bg-white/20 hover:bg-white/30" : "bg-slate-100 hover:bg-slate-200"
              )}
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.5-6.86a1.04 1.04 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14Z"/></svg>
              )}
            </button>
            <div className="flex items-end gap-0.5 h-8 min-w-0 flex-1 max-w-52 overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className={cn("w-1 shrink-0 rounded-full", own ? "bg-white/40" : "bg-slate-300", isPlaying && "animate-pulse")}
                  style={{ height: `${4 + Math.abs(Math.sin(i * 1.7)) * 14}px` }}
                />
              ))}
            </div>
            {duration > 0 ? (
              <span className={cn("text-[11px] tabular-nums", own ? "text-brand-200" : "text-slate-500")}>
                {durationLabel}
              </span>
            ) : null}
            {/* Tezlik tugmasi — Telegram'dagi kabi vaqt yonida, bosilsa
                menyu ochiladi. Faqat tezlik 1.0 bo'lganda "Normal" deb
                yoziladi; boshqa holatda faqat "1.5×" ko'rinadi. */}
            <button
              type="button"
              ref={speedBtnRef}
              data-voice-speed-toggle=""
              aria-label={t("msgSpeedSet")}
              aria-expanded={speedAt !== null}
              title={t("msgSpeedSet")}
              onClick={(e) => {
                e.stopPropagation();
                if (speedAt) {
                  setSpeedAt(null);
                  return;
                }
                const r = e.currentTarget.getBoundingClientRect();
                setSpeedAt({ x: r.left, y: r.top });
              }}
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors",
                own
                  ? "text-white/90 hover:bg-white/20"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {rate === 1 ? t("msgSpeedNormal") : formatRate(rate)}
            </button>
          </div>
        ) : isImage && rawUrl ? (
          <a href={rawUrl} download={fileName} className="block max-h-72 overflow-hidden rounded-2xl" aria-label={t("msgOpenFile")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rawUrl} alt={fileName} loading="lazy" className="max-h-72 rounded-2xl object-cover" />
          </a>
        ) : isFile ? (
          <a
            href={rawUrl ?? "#"}
            download={fileName}
            aria-label={t("msgDownloadFile")}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors",
              own ? "bg-white/15 hover:bg-white/25" : "bg-slate-100 hover:bg-slate-200"
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
            </svg>
            <span className="min-w-0">
              <span className="block max-w-48 truncate font-medium">{fileName}</span>
              <span className={cn("block text-[11px]", own ? "text-brand-200" : "text-slate-500")}>
                {attachment ? formatBytes(attachment.size ?? 0) : t("msgDownloadFile")}
              </span>
            </span>
          </a>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
        )}

        {!isDeleted ? (
          <span className={cn("mt-1 flex items-center justify-end gap-1 text-[11px]", own ? "text-brand-200" : "text-slate-600")}>
            {isEdited ? <span className="italic opacity-70">{t("msgEdited")}</span> : null}
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
        ) : null}
      </div>

      {speedAt && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[92]" aria-hidden="true" onPointerDown={() => setSpeedAt(null)} />
              <div
                ref={speedRef}
                role="menu"
                data-voice-speed-menu=""
                aria-label={t("msgSpeedTitle")}
                onClick={(e) => e.stopPropagation()}
                className="animate-fade-up fixed z-[93] w-56 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-xl dark:border-slate-200/20 dark:bg-[#0e1729]"
                style={{
                  // Tugma ustida ochiladi va ekran chegarasidan chiqmaydi.
                  left: Math.min(Math.max(12, speedAt.x), Math.max(12, window.innerWidth - 236)),
                  top: Math.max(12, speedAt.y - 300),
                }}
              >
                {/* Slider — joriy tezlik ko'rsatkichi bilan */}
                <div className="border-b border-slate-100 px-3 pb-2 pt-3 dark:border-slate-800">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>{t("msgSpeedTitle")}</span>
                    <span data-voice-speed-value="" className="tabular-nums text-brand-900 dark:text-slate-200">
                      {formatRate(rate)}
                    </span>
                  </div>
                  <input
                    type="range"
                    data-voice-speed-slider=""
                    min={MIN_RATE}
                    max={MAX_RATE}
                    step={RATE_STEP}
                    value={rate}
                    aria-label={t("msgSpeedSet")}
                    onChange={(e) => applyRate(Number.parseFloat(e.currentTarget.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-900 dark:bg-slate-700"
                  />
                </div>

                {/* Tayyor tezliklar */}
                <div className="py-1">
                  {RATE_PRESETS.map((preset) => {
                    const active = Math.abs(rate - preset.rate) < 0.001;
                    return (
                      <button
                        key={preset.rate}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        data-voice-speed-option={preset.rate}
                        onClick={() => applyRate(preset.rate)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                          active
                            ? "font-semibold text-brand-900 dark:text-slate-100"
                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                        )}
                      >
                        <span className="w-11 shrink-0 tabular-nums">{formatRate(preset.rate)}</span>
                        <span className="min-w-0 flex-1 truncate">{t(preset.labelKey)}</span>
                        {active ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0" aria-hidden="true">
                            <path d="m5 13 4 4L19 7" />
                          </svg>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}

      {menuAt && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[90]" aria-hidden="true" onPointerDown={closeMenu} />
              <div
                ref={menuRef}
                role="menu"
                data-message-menu=""
                onClick={(e) => e.stopPropagation()}
                className="animate-fade-up fixed z-[91] w-44 overflow-hidden rounded-xl border border-slate-200/70 bg-white py-1 shadow-xl dark:border-slate-200/30 dark:bg-[#0e1729]"
                style={{
                  // Sichqoncha bosilgan nuqtadan ochiladi, ekran chegarasidan
                  // chiqib ketmasligi uchun cheklanadi.
                  left: Math.min(menuAt.x, Math.max(12, window.innerWidth - 188)),
                  top: Math.min(menuAt.y, Math.max(12, window.innerHeight - 190)),
                }}
              >
                <button
                  type="button"
                  data-msg-reply=""
                  onClick={() => { onReply(message); closeMenu(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17l-5-5 5-5"/><path d="M4 12h9a4 4 0 0 1 4 4v1"/></svg>
                  {t("msgReply")}
                </button>
                {!isVoice && !isFile ? (
                  <button
                    type="button"
                    data-msg-copy=""
                    onClick={() => { void navigator.clipboard?.writeText(message.body).catch(() => {}); closeMenu(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-200"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                    {t("msgCopy")}
                  </button>
                ) : null}
                {own && !isVoice && !isFile ? (
                  <button
                    type="button"
                    data-msg-edit=""
                    onClick={() => { onEdit(message); closeMenu(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-200"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    {t("msgEdit")}
                  </button>
                ) : null}
                {own ? (
                  <button
                    type="button"
                    data-msg-delete=""
                    onClick={() => { onDelete(message); closeMenu(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>
                    {t("msgDelete")}
                  </button>
                ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
