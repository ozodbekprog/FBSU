export const THEME_STORAGE_KEY = "ttpu-theme";
export const THEME_CHANGE_EVENT = "ttpu-theme-change";
export const THEME_LIGHT_COLOR = "#1d3460";
export const THEME_DARK_COLOR = "#060910";

export type ThemeMode = "light" | "dark";

export function getStoredTheme(): ThemeMode | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    return null;
  }
  return null;
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function effectiveTheme(mode: ThemeMode | null): ThemeMode {
  if (mode) return mode;
  return "light";
}

export function resolveIsDark(mode: ThemeMode | null): boolean {
  return effectiveTheme(mode) === "dark";
}

export function applyTheme(mode: ThemeMode | null): void {
  const dark = resolveIsDark(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? THEME_DARK_COLOR : THEME_LIGHT_COLOR);
}

export function setStoredTheme(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    return;
  }
  applyTheme(mode);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: mode }));
}

export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}");if(m!=="light"&&m!=="dark")m="light";var d=m==="dark";var e=document.documentElement;if(d)e.classList.add("dark");e.style.colorScheme=d?"dark":"light";var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute("content",d?"${THEME_DARK_COLOR}":"${THEME_LIGHT_COLOR}");}catch(e){}})();`;