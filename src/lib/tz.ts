export const TASHKENT_TZ = "Asia/Tashkent";
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

const DAY_MS = 86_400_000;

type TashkentWall = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function tashkentWall(date: Date): TashkentWall {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TASHKENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hours: get("hour"),
    minutes: get("minute"),
    seconds: get("second"),
  };
}

/**
 * Getter'lari (getHours, getDate, getDay...) har qanday server soat
 * mintaqasida Toshkent vaqtini qaytaradigan sana. Faqat ko'rsatish va
 * devor-soati (wall-clock) hisoblari uchun — haqiqiy epoch sifatida
 * ishlatilmasin.
 */
export function asTashkent(date: Date): Date {
  const value = tashkentWall(date);
  return new Date(value.year, value.month - 1, value.day, value.hours, value.minutes, value.seconds);
}

export function tashkentNow(): Date {
  return asTashkent(new Date());
}

/**
 * Berilgan sananing Toshkentdagi kun boshining haqiqiy epoch'i.
 * Prisma so'rovlarida `gte` kabi chegaralar uchun.
 */
export function tashkentDayStartUtc(date: Date): number {
  const value = tashkentWall(date);
  const localMidnight = new Date(value.year, value.month - 1, value.day);
  const hostOffset = localMidnight.getTime() - Date.UTC(value.year, value.month - 1, value.day);
  return localMidnight.getTime() - (TASHKENT_OFFSET_MS + hostOffset);
}

export function tashkentWindowStartUtc(days: number): number {
  return tashkentDayStartUtc(new Date()) - days * DAY_MS;
}
