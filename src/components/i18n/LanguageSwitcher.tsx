"use client";

import { useEffect, useRef, useState } from "react";
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  LOCALE_MAX_AGE,
  LOCALE_SHORT,
  type Locale,
} from "@/i18n/config";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

function applyLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
  location.reload();
}

export default function LanguageSwitcher({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const rect = rootRef.current?.getBoundingClientRect();
    setDropUp(rect ? rect.bottom > window.innerHeight * 0.55 : false);

    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = t("commonLanguage");

  return (
    <div ref={rootRef} className={cn("relative", className)} data-lang-switcher="">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={label}
        aria-label={`${label}: ${LOCALE_LABELS[locale]}`}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3",
          "text-[11px] font-semibold tracking-wide text-slate-700 transition-colors",
          "hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          "dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
        )}
      >
        <span>{LOCALE_SHORT[locale]}</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn("size-3 transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={label}
          className={cn(
            "absolute left-0 z-50 min-w-[224px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl",
            "dark:border-slate-700 dark:bg-slate-900",
            dropUp ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    if (code === locale) {
                      setOpen(false);
                      return;
                    }
                    applyLocale(code);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    active
                      ? "bg-brand-50 font-semibold text-brand-900 dark:bg-slate-800 dark:text-white"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                  )}
                >
                  <span className="w-7 shrink-0 text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                    {LOCALE_SHORT[code]}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{LOCALE_LABELS[code]}</span>
                  {active ? (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="size-4 shrink-0 text-brand-700 dark:text-gold-300"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
