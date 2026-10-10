"use client";

/**
 * Telegram uslubidagi suhbat menyusi.
 *
 * Bitta nuqtada yopiladi: `Escape`, tashqariga bosish yoki menyu
 * elementlaridan birini tanlash. Bloklash/o'chirish kabi xavfli
 * amallar tasdiqlash oynasini talab qiladi.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type ChatMenuState = {
  pinned: boolean;
  archived: boolean;
  muted: boolean;
  blocked: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  state: ChatMenuState;
  partnerName: string;
  onPin: (value: boolean) => Promise<void> | void;
  onArchive: (value: boolean) => Promise<void> | void;
  onMute: (preset: "1h" | "8h" | "2d" | "forever" | "off") => Promise<void> | void;
  onClearHistory: () => Promise<void> | void;
  onClearForEveryone: () => Promise<void> | void;
  onDeleteChat: () => Promise<void> | void;
  onBlock: (value: boolean) => Promise<void> | void;
  onReport: () => Promise<void> | void;
  onSearch: () => void;
  busy?: boolean;
};

function MenuIcon({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function MenuRow({
  icon,
  label,
  danger,
  sub,
  chevron,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  sub?: React.ReactNode;
  chevron?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-chat-menu-item={label}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span className={cn("shrink-0", danger ? "text-rose-500" : "text-slate-400")}>{icon}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {sub}
      {chevron ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-400" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      ) : null}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-slate-100" />;
}

export function ChatMenu({
  open,
  onClose,
  state,
  partnerName,
  onPin,
  onArchive,
  onMute,
  onClearHistory,
  onClearForEveryone,
  onDeleteChat,
  onBlock,
  onReport,
  onSearch,
  busy,
}: Props) {
  const { t } = useI18n();
  const mounted = useState(true);
  const [muteOpen, setMuteOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "clear" | "clearAll" | "delete">(null);
  const ref = useRef<HTMLDivElement>(null);

    const close = useCallback(() => {
    setMuteOpen(false);
    setConfirm(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  if (!mounted || !open) return null;

  const run = async (fn: () => Promise<void> | void) => {
    await fn();
    close();
  };

  const confirmBody = {
    clear: { text: t("msgConfirmClear"), action: t("msgClearHistory"), run: onClearHistory },
    clearAll: { text: t("msgConfirmClearAll"), action: t("msgClearForEveryone"), run: onClearForEveryone },
    delete: { text: t("msgConfirmDeleteChat"), action: t("msgDeleteChat"), run: onDeleteChat },
  }[confirm ?? "clear"];

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[70]"
        aria-hidden="true"
        onClick={close}
      />
      <div
        ref={ref}
        role="menu"
        aria-label={t("msgMenu")}
        data-chat-menu=""
        className={cn(
          "animate-fade-up fixed z-[71] w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-xl",
          "top-16 right-3 sm:top-14 sm:right-4",
          "max-h-[calc(100dvh-5rem)] overflow-y-auto",
        )}
      >
        {confirm ? (
          <div className="p-3">
            <p className="text-sm text-slate-700">{confirmBody.text}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{partnerName}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                {t("commonCancel") || "Bekor qilish"}
              </button>
              <button
                type="button"
                data-chat-confirm=""
                onClick={() => run(confirmBody.run)}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
              >
                {confirmBody.action}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            <MenuRow
              icon={<MenuIcon d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16M21 21l-4.3-4.3" />}
              label={t("msgSearchInChat")}
              onClick={() => run(onSearch)}
            />
            <MenuRow
              icon={<MenuIcon d="M12 17v5M9 10.8V5a2 2 0 0 1 4 0v5.8l4.3-1.6a1 1 0 0 1 1.3 1.2l-1.6 5a2 2 0 0 1-1.1 1.3L12 19Z" />}
              label={state.pinned ? t("msgUnpin") : t("msgPin")}
              disabled={busy}
              onClick={() => run(() => onPin(!state.pinned))}
            />
            <MenuRow
              icon={<MenuIcon d="M3 7h18v13H3zM3 7l3-4h12l3 4M10 12h4" />}
              label={state.archived ? t("msgUnarchive") : t("msgArchive")}
              disabled={busy}
              onClick={() => run(() => onArchive(!state.archived))}
            />

            {/* Ovozsiz — ochiladigan ichki menyu */}
            <div className="relative">
              <MenuRow
                icon={<MenuIcon d="M11 5 6 9H2v6h4l5 4V5M22 9l-6 6M16 9l6 6" />}
                label={state.muted ? t("msgUnmute") : t("msgMute")}
                chevron
                disabled={busy}
                onClick={() => setMuteOpen((v) => !v)}
              />
              {muteOpen ? (
                <div className="animate-fade-up mt-0.5 space-y-0.5 rounded-xl bg-slate-50 p-1">
                  {(["1h", "8h", "2d", "forever"] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => run(() => onMute(preset))}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-white"
                    >
                      {preset === "1h" && t("msgMute1h")}
                      {preset === "8h" && t("msgMute8h")}
                      {preset === "2d" && t("msgMute2d")}
                      {preset === "forever" && t("msgMuteForever")}
                    </button>
                  ))}
                  {state.muted ? (
                    <button
                      type="button"
                      onClick={() => run(() => onMute("off"))}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-700 hover:bg-white"
                    >
                      {t("msgUnmute")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <MenuDivider />
            <MenuRow
              icon={<MenuIcon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />}
              label={t("msgClearHistory")}
              disabled={busy}
              onClick={() => setConfirm("clear")}
            />
            <MenuRow
              icon={<MenuIcon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7" />}
              label={t("msgClearForEveryone")}
              danger
              disabled={busy}
              onClick={() => setConfirm("clearAll")}
            />
            <MenuRow
              icon={<MenuIcon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />}
              label={t("msgDeleteChat")}
              danger
              disabled={busy}
              onClick={() => setConfirm("delete")}
            />

            <MenuDivider />
            <MenuRow
              icon={<MenuIcon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M4 4l16 16" />}
              label={state.blocked ? t("msgUnblock") : t("msgBlock")}
              danger
              disabled={busy}
              onClick={() => run(() => onBlock(!state.blocked))}
            />
            <MenuRow
              icon={<MenuIcon d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M18 8l3 3M21 8l-3 3" />}
              label={t("msgReport")}
              danger
              disabled={busy}
              onClick={() => run(onReport)}
            />
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}