"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsClient } from "@/lib/use-is-client";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { BUG_ASSISTANT_EVENT } from "./report";
import { stashPendingReport } from "@/components/assistant/pending";

export function BugAssistant() {
  const { t } = useI18n();
  const mounted = useIsClient();
  const pathname = usePathname();
  const [hasPending, setHasPending] = useState(false);
  const lastAutoAt = useRef(0);

  // Global xato ushlash: chat sahifasi ochiq bo'lmagan holda ham
  // xatolarni sessionStorage'ga joylashtirib qo'yamiz —
  // foydalanuvchi /assistant ga kirganda ular qayta qo'llaniladi.
  useEffect(() => {
    const stash = (message: string, stack?: string, autoSend = false) => {
      const now = Date.now();
      if (now - lastAutoAt.current < 20000) return;
      lastAutoAt.current = now;
      stashPendingReport({ message, stack, url: window.location.pathname, autoSend });
      setHasPending(true);
    };

    const onError = (event: ErrorEvent) =>
      stash(event.message || t("mscBugUnknownError"), event.error?.stack as string | undefined);
    const onReject = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string; stack?: string } | undefined;
      stash(reason?.message ?? String(event.reason ?? t("mscBugPromiseError")), reason?.stack);
    };
    const onIssue = (event: Event) => {
      const detail = (
        event as CustomEvent<{ message?: string; label?: string; note?: string; autoSend?: boolean }>
      ).detail;
      if (!detail?.message) return;
      stash(detail.message, undefined, detail.autoSend ?? true);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    window.addEventListener(BUG_ASSISTANT_EVENT, onIssue);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
      window.removeEventListener(BUG_ASSISTANT_EVENT, onIssue);
    };
  }, [t]);

  if (!mounted) return null;
  // Fariza sahifasida chiqmaydi — foydalanuvchi allaqachon suhbat ichida.
  // Dashboardda ham yashiriladi — yangi student panelda AI tugmasi kontentni yopmaydi.
  if (pathname.startsWith("/assistant") || pathname === "/dashboard") return null;

  return (
    <Link
      href="/assistant"
      data-tour="ai-assistant"
      className="fixed bottom-24 right-3 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-700 shadow-lift transition-transform duration-150 hover:scale-105 active:scale-95 sm:px-3 md:bottom-28 md:right-6"
      aria-label={t("mscBugOpen")}
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-brand-900 text-[11px] text-white">
        AI
      </span>
      <span className="hidden sm:inline">{t("mscBugOpen")}</span>
      {hasPending ? (
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
      ) : null}
    </Link>
  );
}
