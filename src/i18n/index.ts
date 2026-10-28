import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { uz, type Dictionary } from "./uz";
import { ru } from "./ru";
import { en } from "./en";
import { toCyrillic, toNewAlphabet, transformDictionary } from "./translit";

const baseDictionaries: Record<"uz" | "ru" | "en", Dictionary> = { uz, ru, en };

const dictionaryCache = new Map<Locale, Dictionary>();

export function getDictionary(locale: Locale): Dictionary {
  const cached = dictionaryCache.get(locale);
  if (cached) return cached;

  let dictionary: Dictionary;
  if (locale === "uz-new") dictionary = transformDictionary(uz, toNewAlphabet);
  else if (locale === "uz-cyrl") dictionary = transformDictionary(uz, toCyrillic);
  else dictionary = baseDictionaries[locale];

  dictionaryCache.set(locale, dictionary);
  return dictionary;
}

export { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, LOCALE_MAX_AGE, isLocale, htmlLang } from "./config";
export { LOCALE_LABELS, LOCALE_SHORT } from "./config";
export type { Locale } from "./config";
export type { Dictionary } from "./uz";

export function t(
  locale: Locale,
  key: keyof Dictionary,
  params?: Record<string, string | number>,
): string {
  const template = getDictionary(locale)[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
