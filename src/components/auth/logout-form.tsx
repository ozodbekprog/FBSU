"use client";

import { logoutAction } from "@/server/logout-action";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { clearOfflineCaches } from "@/lib/offline-cache";

/**
 * Logout is a server action: it verifies the double-submit CSRF token
 * server-side, bumps the session epoch and clears the cookie, then redirects.
 * A plain HTML form cannot do this (the browser cannot attach the header) and
 * would be blocked by the proxy's CSRF gate — correctly, since that is exactly
 * the cross-site forced-logout attack this avoids.
 */
export function LogoutForm() {
  const { t } = useI18n();

  /**
   * Chiqishdan oldin oflayn keshni tozalaymiz.
   *
   * Kesh brauzer darajasida saqlanadi va foydalanuvchilararo umumiy.
   * Tozalamasa, keyingi foydalanuvchi (yoki oiladagi kishi) tarmoq
   * yo'q holda avvalgi foydalanuvchining baholari va xabarlarini ko'rishi
   * mumkin — sessiya cookie'si o'chganiga qaramay. Shuning uchun bu
   * majburiy, "qulaylik" emas.
   */
  async function handleSubmit() {
    await clearOfflineCaches();
  }

  return (
    <form action={logoutAction} onSubmit={handleSubmit}>
      <button
        type="submit"
        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        {t("shellLogout")}
      </button>
    </form>
  );
}