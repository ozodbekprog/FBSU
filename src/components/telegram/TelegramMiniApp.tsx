"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type TelegramBackButton = {
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
};

type TelegramWebApp = {
  initData: string;
  colorScheme?: string;
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  BackButton?: TelegramBackButton;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const LINKED_TEXT: Record<string, string> = {
  uz: "Telegram bog'landi — keyingi safar avtomatik kirasiz",
  "uz-cyrl": "Телеграм боғланди — кейинги сафар автоматик кирасиз",
  ru: "Telegram подключён — в следующий раз вход автоматический",
  en: "Telegram linked — next time you'll sign in automatically",
};

function linkedText(): string {
  const lang = typeof document === "undefined" ? "uz" : document.documentElement.lang;
  return LINKED_TEXT[lang] ?? LINKED_TEXT.uz;
}

/** Telegram ba'zi klientlarda initData'ni faqat URL hash'ida beradi. */
function readInitData(app: TelegramWebApp | undefined): string {
  if (app?.initData) return app.initData;
  if (typeof window === "undefined") return "";
  try {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return "";
    return new URLSearchParams(hash).get("tgWebAppData") ?? "";
  } catch {
    return "";
  }
}

export function TelegramMiniApp() {
  const router = useRouter();
  const pathname = usePathname();
  const [notice, setNotice] = useState<string | null>(null);
  const linkedRef = useRef(false);
  const lastAuthRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const boot = () => {
      const app = window.Telegram?.WebApp;
      if (!app || cancelled) return;

      // Telegram Desktop WebView'da UA ichida "Telegram" bo'lmaydi —
      // shuning uchun initData (yoki URL hash) va webview ko'prigi orqali aniqlaymiz.
      const initData = readInitData(app);
      const proxy = (window as unknown as { TelegramWebviewProxy?: unknown }).TelegramWebviewProxy;
      const inTelegram =
        Boolean(initData) || Boolean(proxy) || /Telegram/i.test(navigator.userAgent);
      if (!inTelegram) return;

      document.documentElement.dataset.telegram = "1";
      window.dispatchEvent(new Event("fbsu:telegram"));
      app.ready();
      app.expand();
      try {
        const dark = document.documentElement.dataset.theme === "dark";
        app.setHeaderColor?.(dark ? "#0b1220" : "#1d3460");
        app.setBackgroundColor?.(dark ? "#0b1220" : "#f6f7fa");
      } catch {}

      const back = app.BackButton;
      const goBack = () => window.history.back();
      if (back) {
        if (window.history.length > 1) back.show();
        back.onClick(goBack);
      }

      if (!initData) return;

      fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ initData }),
      })
        .then((response) => response.json().catch(() => null))
        .then((result: { ok?: boolean; mode?: string } | null) => {
          if (cancelled || !result?.ok) return;
          if (result.mode === "login") {
            const path = window.location.pathname;
            if (path === "/" || path.startsWith("/login")) {
              router.replace("/dashboard");
            } else {
              router.refresh();
            }
            return;
          }
          if (result.mode === "link") {
            linkedRef.current = true;
            setNotice(linkedText());
          }
        })
        .catch(() => {});
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-telegram-web-app]");
    if (existing) {
      boot();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.dataset.telegramWebApp = "true";
    script.addEventListener("load", boot);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", boot);
    };
  }, [router]);

  // Mini ilova ichida parol bilan kirilgandan keyin akkauntni Telegram'ga
  // avtomatik bog'lash: sahifa almashganda initData bilan qayta urinamiz.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const app = window.Telegram?.WebApp;
    const initData = readInitData(app);
    if (!initData || linkedRef.current) return;
    const now = Date.now();
    if (now - lastAuthRef.current < 8000) return;
    lastAuthRef.current = now;

    let cancelled = false;
    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ initData }),
    })
      .then((response) => response.json().catch(() => null))
      .then((result: { ok?: boolean; mode?: string } | null) => {
        if (cancelled || !result?.ok) return;
        if (result.mode === "login") {
          const path = window.location.pathname;
          if (path === "/" || path.startsWith("/login")) {
            router.replace("/dashboard");
          } else {
            router.refresh();
          }
          return;
        }
        if (result.mode === "link") {
          linkedRef.current = true;
          setNotice(linkedText());
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 80,
        maxWidth: "calc(100vw - 2rem)",
        padding: "0.7rem 1.1rem",
        borderRadius: "999px",
        background: "var(--fb-blue, #1d3460)",
        color: "#fff",
        fontSize: "0.85rem",
        lineHeight: 1.35,
        boxShadow: "0 12px 32px rgba(15, 30, 60, 0.28)",
        textAlign: "center",
      }}
    >
      {notice}
    </div>
  );
}
