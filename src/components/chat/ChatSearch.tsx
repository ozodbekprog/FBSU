"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { ChatMessage } from "./shared";
import { fmtClock } from "./shared";

type ChatSearchProps = {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSelect: (messageId: string) => void;
};

type BodyPart = { text: string; match: boolean };

function highlightParts(body: string, query: string): BodyPart[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text: body, match: false }];
  const lower = body.toLowerCase();
  const parts: BodyPart[] = [];
  let from = 0;
  while (from < body.length) {
    const at = lower.indexOf(needle, from);
    if (at === -1) {
      parts.push({ text: body.slice(from), match: false });
      break;
    }
    if (at > from) parts.push({ text: body.slice(from, at), match: false });
    parts.push({ text: body.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }
  return parts;
}

export function ChatSearch({
  open,
  onClose,
  messages,
  currentUserId,
  onSelect,
}: ChatSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [] as ChatMessage[];
    return messages
      .filter((m) => !m.deletedAt && m.body !== "" && m.body.toLowerCase().includes(q))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, q]);

  const foundIndex = currentId ? results.findIndex((m) => m.id === currentId) : -1;
  const currentIndex = foundIndex === -1 && results.length > 0 ? 0 : foundIndex;
  const currentResultId = currentIndex >= 0 ? results[currentIndex].id : null;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  useEffect(() => {
    if (!currentResultId) return;
    panelRef.current
      ?.querySelector<HTMLElement>(`[data-chat-search-result="${currentResultId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [currentResultId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function step(direction: -1 | 1) {
    if (results.length === 0) return;
    const next = (currentIndex + direction + results.length) % results.length;
    setCurrentId(results[next].id);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        step(-1);
        return;
      }
      if (currentResultId) onSelect(currentResultId);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      data-chat-search-panel=""
      className={cn(
        "animate-fade-up mx-2 my-1 flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl dark:border-slate-200/30 dark:bg-[#0e1729]",
      )}
    >
      <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5 dark:border-slate-800">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4 shrink-0 text-slate-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={t("msgSearchPlaceholderChat")}
          aria-label={t("msgSearchInChat")}
          className="h-8 min-w-0 flex-1 bg-transparent px-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
        {q ? (
          <span className="shrink-0 px-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {t("msgSearchResults", { current: currentIndex + 1, total: results.length })}
          </span>
        ) : null}
        <button
          type="button"
          data-chat-search-prev=""
          onClick={() => step(-1)}
          disabled={results.length === 0}
          aria-label={t("msgSearchPrev")}
          title={t("msgSearchPrev")}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          data-chat-search-next=""
          onClick={() => step(1)}
          disabled={results.length === 0}
          aria-label={t("msgSearchNext")}
          title={t("msgSearchNext")}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          data-chat-search-close=""
          onClick={onClose}
          aria-label={t("msgClose")}
          title={t("msgClose")}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-900 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto py-1">
        {q ? (
          results.length > 0 ? (
            results.map((message) => {
              const isCurrent = message.id === currentResultId;
              return (
                <button
                  type="button"
                  key={message.id}
                  data-chat-search-result={message.id}
                  data-chat-search-current={isCurrent ? "" : undefined}
                  onClick={() => onSelect(message.id)}
                  className={cn(
                    "flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm transition-colors",
                    isCurrent
                      ? "bg-brand-50 text-brand-900 dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70",
                  )}
                >
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                    {fmtClock(message.createdAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {message.senderId === currentUserId ? (
                      <span className="text-slate-400 dark:text-slate-500">
                        {t("msgYouPrefix")}
                      </span>
                    ) : null}
                    {highlightParts(message.body, query).map((part, i) =>
                      part.match ? (
                        <mark key={i} className="rounded bg-brand-100 text-brand-900">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={i}>{part.text}</span>
                      ),
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
              {t("msgNoSearchResults")}
            </p>
          )
        ) : (
          <p className="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
            {t("msgSearchQueryHint")}
          </p>
        )}
      </div>
    </div>
  );
}
