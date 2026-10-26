import { tashkentWall } from "@/lib/tz";

export type JournalLessonStatus = "done" | "partial" | "empty";

export type JournalScheduleStatus = "NORMAL" | "CHANGED" | "MOVED" | "CANCELLED";

export type JournalLesson = {
  id: string;
  dayOfWeek: number;
  day: string;
  date: string;
  slot: number;
  time: string;
  subject: string;
  group: string;
  room: string | null;
  courseSlug: string | null;
  attendanceCount: number;
  studentCount: number;
  status: JournalScheduleStatus;
  note: string | null;
  attendanceStatus: JournalLessonStatus;
};

export type JournalWeekData = {
  week: string;
  weekEnd: string;
  today: string;
  lessons: JournalLesson[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isoFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function tashkentToday() {
  const wall = tashkentWall(new Date());
  return isoFromDate(new Date(Date.UTC(wall.year, wall.month - 1, wall.day)));
}

export function addDaysIso(value: string, days: number) {
  const parsed = parseIsoDate(value);
  if (!parsed) return value;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + days);
  return isoFromDate(date);
}

export function mondayOfIso(value: string | null) {
  const parsed = value ? parseIsoDate(value) : parseIsoDate(tashkentToday());
  if (!parsed) return tashkentToday();
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (weekday - 1));
  return isoFromDate(date);
}

export function dayMonth(iso: string) {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

export function formatShortIso(iso: string) {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}

export function weekLabel(monday: string) {
  const end = addDaysIso(monday, 5);
  return `${dayMonth(monday)} – ${dayMonth(end)}.${end.slice(0, 4)}`;
}
