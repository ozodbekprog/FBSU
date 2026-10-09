"use client";

import { useEffect, useState, type ReactNode } from "react";
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

export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(effectiveTheme(getStoredTheme()));

    function sync() {
      setMode(effectiveTheme(getStoredTheme()));
    }
    function onSystemChange() {
      if (getStoredTheme() === null) {
        applyTheme(null);
        setMode(effectiveTheme(null));
      }
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
    };
  }, []);

  return mode;
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