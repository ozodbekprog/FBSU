"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ttpu-pwa-install-dismissed";

const PWA_TEXT: Record<string, { title: string; subtitle: string; install: string; close: string }> = {
  uz: {
    title: "Ilovani o'rnatish",
    subtitle: "FBSU'ni ilova sifatida ochish",
    install: "O'rnatish",
    close: "Yopish",
  },
  ru: {
    title: "Установить приложение",
    subtitle: "Открыть FBSU как приложение",
    install: "Установить",
    close: "Закрыть",
  },
  en: {
    title: "Install app",
    subtitle: "Open FBSU as an app",
    install: "Install",
    close: "Close",
  },
};

function currentLocale(): string {
  if (typeof document === "undefined") return "uz";
  const lang = document.documentElement.lang;
  return lang === "ru" || lang === "en" ? lang : "uz";
}

export function PwaRegister() {
  const text = PWA_TEXT[currentLocale()] ?? PWA_TEXT.uz;
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      } else {
        // Dev rejimda service worker va uning keshlari eski JS fayllarni
        // berib, o'zgarishlar ko'rinmasligiga sabab bo'ladi — ro'yxatdan
        // chiqarib, keshni tozalaymiz.
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((reg) => reg.unregister()))
          .catch(() => undefined);
        if (typeof caches !== "undefined") {
          caches
            .keys()
            .then((keys) => keys.forEach((key) => caches.delete(key)))
            .catch(() => undefined);
        }
      }
    }

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setPromptEvent(null);
    window.localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setPromptEvent(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-brand-100 bg-white p-3 shadow-xl">
      <img src="/logo.svg" alt="" width={40} height={40} className="shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{text.title}</p>
        <p className="text-xs text-slate-500">{text.subtitle}</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-lg bg-brand-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800"
      >
        {text.install}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={text.close}
        className="shrink-0 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
