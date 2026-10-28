export const LOCALES = ["uz", "uz-new", "uz-cyrl", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

export const LOCALE_COOKIE = "locale";

export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "Oʻzbekcha",
  "uz-new": "Oʻzbekcha — yangi alifbo",
  "uz-cyrl": "Ўзбекча — кирилл",
  ru: "Русский",
  en: "English",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  uz: "UZ",
  "uz-new": "ÖZ",
  "uz-cyrl": "ЎЗ",
  ru: "RU",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function htmlLang(locale: Locale): string {
  if (locale === "uz-new") return "uz-Latn";
  if (locale === "uz-cyrl") return "uz-Cyrl";
  return locale;
}
