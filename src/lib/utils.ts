export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type DateLocale = "uz" | "uz-new" | "uz-cyrl" | "ru" | "en";

const DAYS: Record<DateLocale, string[]> = {
  uz: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
  "uz-new": ["Yakşanba", "Duşanba", "Seşanba", "Çorşanba", "Payşanba", "Juma", "Şanba"],
  "uz-cyrl": ["Якшанба", "Душанба", "Сешанба", "Чоршанба", "Пайшанба", "Жума", "Шанба"],
  ru: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

const MONTHS: Record<DateLocale, string[]> = {
  uz: [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
  ],
  "uz-new": [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
  ],
  "uz-cyrl": [
    "январ", "феврал", "март", "апрел", "май", "июн",
    "июл", "август", "сентябр", "октябр", "ноябр", "декабр",
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

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

function tashkentParts(value: Date | string) {
  const shifted = new Date(new Date(value).getTime() + TASHKENT_OFFSET_MS);
  return {
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth(),
    year: shifted.getUTCFullYear(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

export function fmtDate(value: Date | string | null | undefined, locale?: DateLocale) {
  if (!value) return "—";
  const { day, month, year } = tashkentParts(value);
  const resolved = resolveDateLocale(locale);
  const months = MONTHS[resolved];
  if (resolved === "en") {
    return `${months[month]} ${day}, ${year}`;
  }
  return `${day}-${months[month]}, ${year}`;
}

export function fmtDateTime(value: Date | string | null | undefined, locale?: DateLocale) {
  if (!value) return "—";
  const { hours, minutes } = tashkentParts(value);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${fmtDate(value, locale)} ${hh}:${mm}`;
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
