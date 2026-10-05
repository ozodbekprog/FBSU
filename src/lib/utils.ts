export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type DateLocale = "uz" | "ru" | "en";

const DAYS: Record<DateLocale, string[]> = {
  uz: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
  ru: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

const MONTHS: Record<DateLocale, string[]> = {
  uz: [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
  ],
  ru: [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};

let currentDateLocale: DateLocale = "uz";

export function setDateLocale(locale: DateLocale) {
  currentDateLocale = locale;
}

export function currentLocale(): DateLocale {
  return currentDateLocale;
}

function resolveDateLocale(explicit?: DateLocale): DateLocale {
  return explicit ?? currentDateLocale;
}

export function monthName(monthIndex: number, locale?: DateLocale) {
  const name = MONTHS[resolveDateLocale(locale)][monthIndex % 12];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

export function dayName(dayOfWeek: number, locale?: DateLocale) {
  return DAYS[resolveDateLocale(locale)][dayOfWeek % 7];
}

export function fmtDate(value: Date | string | null | undefined, locale?: DateLocale) {
  if (!value) return "—";
  const d = new Date(value);
  const resolved = resolveDateLocale(locale);
  const months = MONTHS[resolved];
  if (resolved === "en") {
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return `${d.getDate()}-${months[d.getMonth()]}, ${d.getFullYear()}`;
}

export function fmtDateTime(value: Date | string | null | undefined, locale?: DateLocale) {
  if (!value) return "—";
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${fmtDate(d, locale)} ${hh}:${mm}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function gradeColor(score: number | null | undefined, max = 100) {
  if (score == null) return "text-slate-600";
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-rose-600";
}

export function scorePercent(score: number | null | undefined, max = 100) {
  if (score == null) return null;
  return Math.round((score / max) * 100);
}
