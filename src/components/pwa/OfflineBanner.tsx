"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { useNetworkState } from "@/lib/use-network-state";
import { cn } from "@/lib/utils";

/**
 * Oflayn indikator paneli.
 *
 * Foydalanuvchi oflaynligini bilishi shart — aks holda eskirgan ma'lumotni
 * yangi deb xato talqin qiladi. Panel yuqorida chiqadi va aloqa tiklangach
 * o'z-o'zidan yo'qoladi.
 */
export function OfflineBanner({ className }: { className?: string }) {
  const { t } = useI18n();
  const { offline } = useNetworkState();
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    // `setState` hodisa ichida (effect tanasida emas) — bu React uchun
    // tabiiy yo'l va "cascading render" xatosini keltirmaydi.
    function onOnline() {
      setRestored(true);
      window.setTimeout(() => setRestored(false), 2500);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  if (!offline && !restored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-offline-banner={offline ? "offline" : "online"}
      className={cn(
        "fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium shadow-sm",
        offline ? "bg-amber-500 text-amber-950" : "bg-emerald-600 text-white",
        className,
      )}
    >
      {offline ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M1 1l22 22M16.7 12.7A6 6 0 0 0 12 15a6 6 0 0 0-2.3-.45M5 10.5A11 11 0 0 1 9 8M2 7a16 16 0 0 1 4.5-2.6M12 4a16 16 0 0 1 8.5 3.6" />
            <circle cx="12" cy="19" r="1" />
          </svg>
          <strong>{t("shellOfflineTitle")}</strong>
          <span className="hidden opacity-80 sm:inline">· {t("shellOfflineHint")}</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {t("shellOnlineAgain")}
        </>
      )}
    </div>
  );
}