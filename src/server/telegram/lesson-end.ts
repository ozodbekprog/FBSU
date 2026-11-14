import "server-only";
import { prisma } from "@/lib/prisma";
import {
  DAY_TITLES,
  SEPARATOR,
  SLOT_TIMES,
  escapeHtml,
  matchCourseSlug,
  normalizeTeacher,
  parityFilter,
  richLesson,
  richTeacherLesson,
  tashkentNow,
  tashkentStartOfDay,
  type RichEntry,
  type TeacherLesson,
} from "./rich";
import {
  appUrl,
  reminderKeyboard,
  sendRichBotMessage,
  telegramConfigured,
} from "./send";

export const LESSON_ALERT_LEAD_MINUTES = 10;
export const LESSON_ALERT_GRACE_MINUTES = 15;

type TargetUser = {
  id: string;
  name: string;
  role: string;
  telegramId: string | null;
  groupId: string | null;
  group: { name: string } | null;
};

type EntryRow = {
  id: string;
  groupId: string;
  teacherId: string | null;
  teacher: string | null;
  dayOfWeek: number;
  slot: number;
  subject: string;
  room: string | null;
  lessonType: string | null;
  note: string | null;
  status: string;
  group: { name: string } | null;
};

export type LessonAlertEntry = RichEntry & {
  groupName?: string | null;
  slug?: string | null;
};

export type LessonEndResult = {
  slot: number | null;
  total: number;
  sent: number;
  failed: number;
  skipped: string;
};

function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function slotEndMinutes(slot: number): number | null {
  const range = SLOT_TIMES[slot];
  if (!range) return null;
  const end = range.split(/[–-]/)[1];
  return end ? parseClock(end) : null;
}

export function activeLessonSlot(nowMinutes: number): number | null {
  let best: { slot: number; distance: number } | null = null;
  for (const slot of Object.keys(SLOT_TIMES).map(Number)) {
    const end = slotEndMinutes(slot);
    if (end === null) continue;
    if (
      nowMinutes < end - LESSON_ALERT_LEAD_MINUTES ||
      nowMinutes > end + LESSON_ALERT_GRACE_MINUTES
    ) {
      continue;
    }
    const distance = Math.abs(end - nowMinutes);
    if (!best || distance < best.distance) best = { slot, distance };
  }
  return best?.slot ?? null;
}

export function minutesUntilSlotEnd(slot: number, nowMinutes: number): number {
  const end = slotEndMinutes(slot);
  return end === null ? 0 : end - nowMinutes;
}

function toTeacherLesson(entry: LessonAlertEntry): TeacherLesson {
  return {
    entry,
    groupName: entry.groupName ?? "",
    slug: entry.slug ?? null,
  };
}

export function lessonAlertText(input: {
  role: string;
  groupName?: string | null;
  slot: number;
  minutesLeft: number;
  now: ReturnType<typeof tashkentNow>;
  current: LessonAlertEntry[];
  next: LessonAlertEntry[];
}): string {
  const lines: string[] = [];
  lines.push(
    input.minutesLeft > 0
      ? `⏰ <b>Dars tugashiga ${input.minutesLeft} daqiqa qoldi</b>`
      : "✅ <b>Dars tugadi</b>",
  );
  lines.push(`📅 <b>${DAY_TITLES[input.now.jsDay]}</b>, ${input.now.dateLabel}`);
  if (input.groupName) lines.push(`👥 Guruh: <b>${escapeHtml(input.groupName)}</b>`);
  lines.push(SEPARATOR, "");
  lines.push("📚 <b>Hozirgi dars</b>");
  for (const entry of input.current) {
    lines.push(
      input.role === "TEACHER"
        ? richTeacherLesson(toTeacherLesson(entry), input.now.iso, appUrl())
        : richLesson(entry),
    );
    lines.push("");
  }
  lines.push("📌 <b>Keyingi darslar</b>");
  if (input.next.length === 0) {
    lines.push("🎉 <i>Bugun boshqa darslar yo'q.</i>");
  } else {
    for (const entry of input.next) {
      lines.push(
        input.role === "TEACHER"
          ? richTeacherLesson(toTeacherLesson(entry), input.now.iso, appUrl())
          : richLesson(entry),
      );
      lines.push("");
    }
    lines.pop();
  }
  return lines.join("\n");
}

function readSent(value: unknown): Set<string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return new Set();
  const raw = (value as { sent?: unknown }).sent;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((item): item is string => typeof item === "string"));
}

function addToMap<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await fn(item);
    }
  });
  await Promise.all(workers);
}

function studentEntriesFor(user: TargetUser, byGroup: Map<string, EntryRow[]>): EntryRow[] {
  return user.groupId ? (byGroup.get(user.groupId) ?? []) : [];
}

function teacherEntriesFor(
  user: TargetUser,
  byTeacherId: Map<string, EntryRow[]>,
  byTeacherName: Map<string, EntryRow[]>,
): EntryRow[] {
  const byId = byTeacherId.get(user.id) ?? [];
  const byName = byTeacherName.get(normalizeTeacher(user.name)) ?? [];
  if (byName.length === 0) return byId;
  const seen = new Set(byId.map((entry) => entry.id));
  return [...byId, ...byName.filter((entry) => !seen.has(entry.id))];
}

export async function sendLessonEndAlerts(): Promise<LessonEndResult> {
  const now = tashkentNow();
  if (!telegramConfigured()) {
    return { slot: null, total: 0, sent: 0, failed: 0, skipped: "token-yoq" };
  }
  if (now.jsDay === 0) {
    return { slot: null, total: 0, sent: 0, failed: 0, skipped: "dam-kuni" };
  }
  const nowMinutes = now.hour * 60 + now.minute;
  const slot = activeLessonSlot(nowMinutes);
  if (slot === null) {
    return { slot: null, total: 0, sent: 0, failed: 0, skipped: "oyna-yoq" };
  }

  const key = `telegram:lesson-end:${now.iso}`;
  const dayStart = tashkentStartOfDay(0);
  const [userRows, entryRows, courses, stateRow] = await Promise.all([
    prisma.user.findMany({
      where: {
        telegramId: { not: null },
        isActive: true,
        role: { in: ["STUDENT", "TEACHER"] },
      },
      select: {
        id: true,
        name: true,
        role: true,
        telegramId: true,
        groupId: true,
        group: { select: { name: true } },
      },
    }),
    prisma.scheduleEntry.findMany({
      where: { dayOfWeek: now.dow, ...parityFilter(dayStart) },
      orderBy: { slot: "asc" },
      select: {
        id: true,
        groupId: true,
        teacherId: true,
        teacher: true,
        dayOfWeek: true,
        slot: true,
        subject: true,
        room: true,
        lessonType: true,
        note: true,
        status: true,
        group: { select: { name: true } },
      },
    }),
    prisma.course.findMany({ select: { id: true, title: true, slug: true, teacherId: true } }),
    prisma.appSetting.findUnique({ where: { key } }),
  ]);
  const users = userRows as TargetUser[];
  const entries = entryRows as EntryRow[];
  if (users.length === 0) {
    return { slot, total: 0, sent: 0, failed: 0, skipped: "foydalanuvchi-yoq" };
  }

  const byGroup = new Map<string, EntryRow[]>();
  const byTeacherId = new Map<string, EntryRow[]>();
  const byTeacherName = new Map<string, EntryRow[]>();
  for (const entry of entries) {
    addToMap(byGroup, entry.groupId, entry);
    if (entry.teacherId) addToMap(byTeacherId, entry.teacherId, entry);
    if (entry.teacher) addToMap(byTeacherName, normalizeTeacher(entry.teacher), entry);
  }

  const coursesByTeacher = new Map<string, { id: string; title: string; slug: string }[]>();
  for (const course of courses) {
    if (!course.teacherId) continue;
    addToMap(coursesByTeacher, course.teacherId, {
      id: course.id,
      title: course.title,
      slug: course.slug,
    });
  }

  const sent = readSent(stateRow?.value);
  const initialSent = sent.size;
  const minutesLeft = minutesUntilSlotEnd(slot, nowMinutes);
  let total = 0;
  let sentCount = 0;
  let failed = 0;

  await mapLimit(users, 5, async (user) => {
    if (!user.telegramId) return;
    const isTeacher = user.role === "TEACHER";
    const all = isTeacher
      ? teacherEntriesFor(user, byTeacherId, byTeacherName)
      : studentEntriesFor(user, byGroup);
    const current = all.filter((entry) => entry.slot === slot && entry.status !== "CANCELLED");
    if (current.length === 0) return;
    const sentKey = `${user.id}:${slot}`;
    if (sent.has(sentKey)) return;

    total += 1;
    const next = all
      .filter((entry) => entry.slot > slot)
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        ...entry,
        groupName: entry.group?.name ?? null,
        slug: isTeacher
          ? matchCourseSlug(entry.subject, coursesByTeacher.get(user.id) ?? [])
          : null,
      }));
    const text = lessonAlertText({
      role: user.role,
      groupName: user.group?.name ?? null,
      slot,
      minutesLeft,
      now,
      current,
      next,
    });

    try {
      await sendRichBotMessage(user.telegramId, text, reminderKeyboard());
      sent.add(sentKey);
      sentCount += 1;
    } catch (error) {
      failed += 1;
      console.error(
        "[telegram-lesson-end]",
        user.id,
        error instanceof Error ? error.message : error,
      );
    }
  });

  if (sent.size > initialSent) {
    try {
      await prisma.appSetting.upsert({
        where: { key },
        create: { key, value: { sent: [...sent] } },
        update: { value: { sent: [...sent] } },
      });
    } catch (error) {
      console.error(
        "[telegram-lesson-end-state]",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return { slot, total, sent: sentCount, failed, skipped: "" };
}
