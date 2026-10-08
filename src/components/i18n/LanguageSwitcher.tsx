"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_COOKIE, LOCALE_MAX_AGE, type Locale } from "@/i18n/config";
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
  const groupRef = useRef<HTMLDivElement | null>(null);
  const compactRef = useRef<HTMLButtonElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Yopiq sidebar'da rail 80px — uchta tugma (124px) sig'maydi va
  // markazga tekislanganda ikki tomondan kesiladi. Shuning uchun yopiq
  // holatda faqat joriy til ko'rsatiladi (≈40px) va bosilganda keyingi
  // tilga o'tadi. Kengaytirilganda uchala tugma qaytadi.
  //
  // Mobil drawer `<aside>` dan tashqarida (portal orqali body ga) — shuning
  // uchun u yopiq holatga hisoblanmaydi va uchala tugmani ko'rsatadi.
  useEffect(() => {
    const root = (compactRef.current ?? groupRef.current)
      ?.closest("aside")
      ?.querySelector("[data-nav-shell]");
    if (!root) return;
    const read = () => setCollapsed(root.getAttribute("data-collapsed") === "true");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-collapsed"] });
    return () => observer.disconnect();
  }, []);

  const cycle = () => {
    const index = LOCALES.indexOf(locale);
    applyLocale(LOCALES[(index + 1) % LOCALES.length]);
  };

  const label = t("commonLanguage");

  if (collapsed) {
    return (
      <button
        ref={compactRef}
        type="button"
        onClick={cycle}
        title={label}
        aria-label={`${label}: ${locale.toUpperCase()}`}
        data-lang-switcher=""
        className={cn(
          "mx-auto flex h-9 min-w-11 items-center justify-center rounded-full bg-slate-100 px-2",
          "text-[11px] font-semibold tracking-wide text-slate-700 transition-colors",
          "hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          className,
        )}
      >
        {locale.toUpperCase()}
      </button>
    );
  }

  return (
    <div
      ref={groupRef}
      className={cn("inline-flex items-center gap-0.5 rounded-full bg-slate-100 p-1", className)}
      role="group"
      aria-label={label}
      data-lang-switcher=""
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => {
              if (code === locale) return;
              applyLocale(code);
            }}
            aria-pressed={active}
            className={cn(
              // `relative` + `after` — ko'rinadigan o'lchamni o'zgartirmasdan
              // barmoq uchun bosish maydonini 44px gacha kengaytiradi.
              "relative rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors duration-150",
              "after:absolute after:inset-x-0 after:-inset-y-3 after:content-['']",
              active
                ? "bg-white text-brand-800 shadow-sm"
                : "text-slate-500 hover:text-brand-700",
            )}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}