"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  THEME_CHANGE_EVENT,
  applyTheme,
  effectiveTheme,
  getStoredTheme,
  setStoredTheme,
  type ThemeMode,
} from "@/lib/theme";

/**
 * Joriy rejim.
 *
 * Avval `useState(() => effectiveTheme(getStoredTheme()))` ishlatilardi —
 * bu render paytida `localStorage` o'qidi. Serverda `localStorage` yo'q,
 * shuning uchun server har doim "light" chiqarardi, brauzer esa saqlangan
 * "dark" ni. Natijada **hydration mismatch** (ThemeToggle ikki xil markup
 * berardi) va butun daraxt mijozda qayta qurilardi.
 *
 * `useSyncExternalStore` buning o'rnini bosadi: uchchinchi (`server`)
 * argument orqali server qiymati aniq belgilanadi, shuning uchun React
 * hydrationni xatosiz bajaradi va `setState-in-effect` ham kelmaydi.
 */
function subscribeTheme(onStoreChange: () => void) {
  function onSystemChange() {
    if (getStoredTheme() === null) {
      applyTheme(null);
      onStoreChange();
    }
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function getThemeSnapshot(): ThemeMode {
  return effectiveTheme(getStoredTheme());
}

// Serverda `localStorage` yo'q — har doim standart "light".
const getThemeServerSnapshot = (): ThemeMode => "light";

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const mode = useThemeMode();
  const next: ThemeMode = mode === "dark" ? "light" : "dark";
  const label = next === "dark" ? t("shellThemeSwitchDark") : t("shellThemeSwitchLight");

  return (
    <button
      type="button"
      onClick={() => setStoredTheme(next)}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:bg-brand-50 hover:text-brand-900 after:absolute after:-inset-1 after:content-['']",
        className,
      )}
    >
      {mode === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

export function ThemePicker() {
  const { t } = useI18n();
  const mode = useThemeMode();
  const options: { value: ThemeMode; label: string; icon: ReactNode }[] = [
    { value: "light", label: t("shellThemeLightShort"), icon: <SunIcon /> },
    { value: "dark", label: t("shellThemeDarkShort"), icon: <MoonIcon /> },
  ];

  return (
    <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setStoredTheme(option.value)}
          aria-pressed={mode === option.value}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 [&_svg]:size-4",
            mode === option.value
              ? "bg-white text-brand-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
