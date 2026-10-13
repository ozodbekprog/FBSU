"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { noteSnippet, searchNotes } from "@/lib/openboard/store";
import type { OpenboardNote } from "@/lib/openboard/types";

export type NewNoteKind = "empty" | "sketch" | "lab";

export function NotesSidebar({
  notes,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
}: {
  notes: OpenboardNote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (kind: NewNoteKind) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }),
    [locale],
  );

  const sorted = useMemo(
    () => [...notes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [notes],
  );

  const visible = useMemo(
    () => (query.trim() ? searchNotes(sorted, query) : sorted),
    [sorted, query],
  );

  const options: { kind: NewNoteKind; label: string }[] = [
    { kind: "empty", label: t("brdNewEmpty") },
    { kind: "sketch", label: t("brdNewSketch") },
    { kind: "lab", label: t("brdNewLab") },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col md:border-r md:border-slate-200">
      <div className="flex items-center gap-2 p-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("brdSearchPlaceholder")}
          className="h-9 text-sm"
        />
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={t("brdNewNote")}
            title={t("brdNewNote")}
            className="inline-flex size-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-medium text-white transition-colors hover:bg-blue-700"
          >
            +
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
              {options.map((option) => (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onCreate(option.kind);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-slate-500">
            {query.trim() ? t("brdSearchEmpty") : t("brdEmptyNotes")}
          </p>
        ) : (
          <div className="space-y-1">
            {visible.map((note) => {
              const selected = note.id === selectedId;
              const date = new Date(note.updatedAt);
              return (
                <div
                  key={note.id}
                  className={cn(
                    "group relative rounded-xl transition-colors",
                    selected ? "bg-blue-50" : "hover:bg-slate-50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(note.id)}
                    className="block w-full px-3 py-2.5 pr-14 text-left"
                  >
                    <span className="flex items-start gap-2">
                      <span className="mt-0.5 text-base leading-none">{note.icon || "📝"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-800">
                            {note.title.trim() || t("brdUntitled")}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {Number.isNaN(date.getTime()) ? "" : formatter.format(date)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {noteSnippet(note)}
                        </span>
                      </span>
                    </span>
                  </button>
                  <div className="absolute right-2 top-2.5 hidden items-center gap-1 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => onDuplicate(note.id)}
                      aria-label={t("brdNoteDuplicate")}
                      title={t("brdNoteDuplicate")}
                      className="inline-flex size-6 items-center justify-center rounded-md bg-white/90 text-slate-400 shadow-sm transition-colors hover:text-blue-600"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="12" height="12" rx="2" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t("brdNoteDeleteConfirm"))) onDelete(note.id);
                      }}
                      aria-label={t("brdNoteDelete")}
                      title={t("brdNoteDelete")}
                      className="inline-flex size-6 items-center justify-center rounded-md bg-white/90 text-slate-400 shadow-sm transition-colors hover:text-rose-600"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
        {t("brdNoteCount", { count: notes.length })}
      </div>
    </div>
  );
}
