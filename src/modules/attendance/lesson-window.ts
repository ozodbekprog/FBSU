export type LessonWindow = { start: number; end: number };

export const SLOT_WINDOWS: Record<number, LessonWindow> = {
  1: { start: 540, end: 620 },
  2: { start: 630, end: 710 },
  3: { start: 720, end: 800 },
  4: { start: 860, end: 940 },
  5: { start: 950, end: 1030 },
  6: { start: 1040, end: 1120 },
  7: { start: 1130, end: 1210 },
  8: { start: 1220, end: 1300 },
};

export const TASHKENT_OFFSET_MINUTES = 5 * 60;
export const LESSON_LEAD_MINUTES = 15;

export type LessonCandidate = {
  id: string;
  dayOfWeek: number;
  slot: number;
};

export function tashkentClock(now: Date = new Date()): { dayOfWeek: number; minutes: number } {
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MINUTES * 60_000);
  const jsDay = local.getUTCDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;
  return { dayOfWeek, minutes: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

export function lessonState(
  entry: LessonCandidate,
  now: Date = new Date(),
): "upcoming" | "ongoing" | null {
  const { dayOfWeek, minutes } = tashkentClock(now);
  if (entry.dayOfWeek !== dayOfWeek) return null;
  const window = SLOT_WINDOWS[entry.slot];
  if (!window) return null;
  if (minutes >= window.start && minutes <= window.end) return "ongoing";
  if (minutes >= window.start - LESSON_LEAD_MINUTES && minutes < window.start) return "upcoming";
  return null;
}

export function currentLesson<T extends LessonCandidate>(entries: T[], now: Date = new Date()): T | null {
  let upcoming: T | null = null;
  for (const entry of entries) {
    const state = lessonState(entry, now);
    if (state === "ongoing") return entry;
    if (state === "upcoming" && upcoming === null) upcoming = entry;
  }
  return upcoming;
}

export function minutesUntilStart(entry: LessonCandidate, now: Date = new Date()): number {
  const window = SLOT_WINDOWS[entry.slot];
  if (!window) return 0;
  const { minutes } = tashkentClock(now);
  return Math.max(0, window.start - minutes);
}
