"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";

type UnreadResponse = { ok: boolean; data?: { count: number } };

export function UnreadBadge() {
  const { t } = useI18n();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/chat/unread", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as UnreadResponse | null;
        if (!active) return;
        if (res.ok && json?.ok && json.data) setCount(json.data.count);
      } catch {
        return;
      }
    }

    void load();
    const timer = setInterval(() => {
      void load();
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span
      role="status"
      aria-label={t("msgUnreadMessages", { count })}
      className="relative inline-flex size-9 items-center justify-center rounded-xl text-slate-500"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] leading-4 font-semibold text-white ring-2 ring-white">
        {count > 99 ? "99+" : count}
      </span>
    </span>
  );
}
