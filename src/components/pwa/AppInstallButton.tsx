"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { Button, ButtonLink } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  getDeferredInstallPrompt,
  setDeferredInstallPrompt,
  subscribeDeferredInstallPrompt,
} from "./install-prompt";

const PILL_SIZES: Record<string, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

const STANDALONE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
];

function subscribeStandalone(onChange: () => void): () => void {
  const queries = STANDALONE_QUERIES.map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

function getStandalone(): boolean {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    STANDALONE_QUERIES.some((query) => window.matchMedia(query).matches) ||
    navigatorWithStandalone.standalone === true
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * "Ilovani o'rnatish" tugmasi (PWA install).
 *
 * - Promt mavjud bo'lsa (Android/Chrome, desktop Chrome) — bosilganda
 *   brauzerning rasmiy o'rnatish oynasi ochiladi.
 * - Ilova allaqachon o'rnatilgan bo'lsa — "O'rnatilgan" holati ko'rsatiladi.
 * - Qo'llab-quvvatlanmasa (iOS Safari, Firefox) — `withManualHint` bo'lsa
 *   yo'riqnomaga havola ko'rsatiladi, aks holda hech narsa chiqmaydi.
 */
export function AppInstallButton({
  size = "md",
  className,
  withManualHint = false,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  withManualHint?: boolean;
}) {
  const { t } = useI18n();
  const [installed, setInstalled] = useState(false);

  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandalone, () => false);
  const deferredPrompt = useSyncExternalStore(
    (onChange) => subscribeDeferredInstallPrompt(() => onChange()),
    () => getDeferredInstallPrompt(),
    () => null,
  );

  useEffect(() => {
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredInstallPrompt(null);
    };
    window.addEventListener("appinstalled", handleInstalled);
    return () => window.removeEventListener("appinstalled", handleInstalled);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setDeferredInstallPrompt(null);
      }
    } catch {
      // Promt allaqachon ishlatilgan yoki brauzer rad etdi — jim o'tamiz,
      // foydalanuvchi yo'riqnoma sahifasidan foydalanishi mumkin.
    }
  };

  if (installed || isStandalone) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 font-medium text-emerald-700",
          PILL_SIZES[size],
          className,
        )}
      >
        <CheckIcon />
        {t("landAppInstalled")}
      </span>
    );
  }

  if (deferredPrompt) {
    return (
      <Button variant="primary" size={size} className={className} onClick={install}>
        <DownloadIcon />
        {t("landAppInstall")}
      </Button>
    );
  }

  if (withManualHint) {
    return (
      <ButtonLink href="/app" variant="secondary" size={size} className={className}>
        <DownloadIcon />
        {t("landAppDetails")}
      </ButtonLink>
    );
  }

  return null;
}
