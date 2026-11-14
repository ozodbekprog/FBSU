export const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
export const SEPARATOR = "━━━━━━━━━━━━━━━━━━";

export const SLOT_TIMES: Record<number, string> = {
  1: "09:00–10:20",
  2: "10:30–11:50",
  3: "12:00–13:20",
  4: "14:20–15:40",
  5: "15:50–17:10",
  6: "17:20–18:40",
  7: "18:50–20:10",
  8: "20:20–21:40",
};

export const DAY_TITLES = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];

export const STATUS_LABELS: Record<string, string> = {
  CHANGED: "🔄 O'zgartirilgan",
  MOVED: "➡️ Ko'chirilgan",
  CANCELLED: "❌ Bekor qilindi",
};

export type RichEntry = {
  dayOfWeek?: number;
  slot: number;
  subject: string;
  room?: string | null;
  teacher?: string | null;
  lessonType?: string | null;
  note?: string | null;
  status?: string | null;
  group?: { name: string } | null;
  groupName?: string | null;
};

export type TeacherLesson = {
  entry: RichEntry;
  groupName: string;
  slug: string | null;
};

export type DailyDeadline = {
  text: string;
  dueAt: Date;
};

export type DailyExam = {
  course: string;
  title: string;
  date?: Date;
  room?: string | null;
  time?: string;
  seat?: string | null;
  permitted?: boolean;
  sheets?: number;
  graded?: number;
};

export type DailyUser = {
  name: string;
  role: string;
  group?: { name: string } | null;
};

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function tashkentNow(offsetDays = 0) {
  const base = new Date(Date.now() + TZ_OFFSET_MS + offsetDays * 86_400_000);
  const jsDay = base.getUTCDay();
  const day = String(base.getUTCDate()).padStart(2, "0");
  const month = String(base.getUTCMonth() + 1).padStart(2, "0");
  const year = base.getUTCFullYear();
  return {
    jsDay,
    dow: jsDay === 0 ? 7 : jsDay,
    hour: base.getUTCHours(),
    minute: base.getUTCMinutes(),
    title: DAY_TITLES[jsDay],
    dateLabel: `${day}.${month}.${year}`,
    iso: `${year}-${month}-${day}`,
  };
}

export function tashkentStartOfDay(offsetDays = 0): Date {
  const now = tashkentNow(offsetDays);
  return new Date(Date.parse(`${now.iso}T00:00:00+05:00`));
}

export function tashkentDayEnd(offsetDays = 0): Date {
  return new Date(tashkentStartOfDay(offsetDays).getTime() + 86_400_000);
}

export function tashkentParts(date: Date) {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MS);
  return {
    jsDay: shifted.getUTCDay(),
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth() + 1,
    year: shifted.getUTCFullYear(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

export function dateKey(date: Date): string {
  const parts = tashkentParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function formatDateUz(date: Date): string {
  const parts = tashkentParts(date);
  return `${pad2(parts.day)}.${pad2(parts.month)}.${parts.year}`;
}

export function timeText(date: Date): string {
  const parts = tashkentParts(date);
  return `${pad2(parts.hours)}:${pad2(parts.minutes)}`;
}

export function isoWeekNumber(date: Date): number {
  const parts = tashkentParts(date);
  const copy = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const weekday = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil(((copy.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function weekParity(date: Date): "odd" | "even" {
  return isoWeekNumber(date) % 2 === 1 ? "odd" : "even";
}

export function parityFilter(date: Date) {
  return { OR: [{ parity: null }, { parity: weekParity(date) }] };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function splitText(text: string, limit = 3800): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let buffer = "";
  let quote = "";
  for (const line of text.split("\n")) {
    const open = /^<blockquote[^>]*>$/i.test(line) ? line : "";
    const close = /^<\/blockquote>$/i.test(line);
    if (buffer && buffer.length + line.length + 1 + (quote ? 14 : 0) > limit) {
      chunks.push(quote ? `${buffer}\n</blockquote>` : buffer);
      buffer = quote ? `${quote}\n${line}` : line;
    } else {
      buffer = buffer ? `${buffer}\n${line}` : line;
    }
    if (open) quote = open;
    if (close) quote = "";
  }
  if (buffer) chunks.push(quote ? `${buffer}\n</blockquote>` : buffer);
  return chunks;
}

export function richLesson(entry: RichEntry, options: { showTeacher?: boolean } = {}): string {
  const showTeacher = options.showTeacher !== false;
  const time = SLOT_TIMES[entry.slot];
  const lines = [`🕘 <b>${entry.slot}-par</b>${time ? ` · ${time}` : ""}`];
  lines.push(`📚 <b>${escapeHtml(entry.subject)}</b>`);
  const meta: string[] = [];
  if (entry.lessonType) meta.push(`🏷 ${escapeHtml(entry.lessonType)}`);
  if (entry.room) meta.push(`🚪 ${escapeHtml(entry.room)}`);
  if (showTeacher && entry.teacher) meta.push(`👨‍🏫 ${escapeHtml(entry.teacher)}`);
  if (meta.length > 0) lines.push(meta.join(" · "));
  if (entry.note) lines.push(`📝 <i>${escapeHtml(entry.note)}</i>`);
  const status = STATUS_LABELS[entry.status ?? ""] ?? "";
  if (status) lines.push(`<i>${status}</i>`);
  return lines.join("\n");
}

export function richEntries(entries: RichEntry[]): string {
  return entries.map((entry) => richLesson(entry)).join("\n\n");
}

export function richTeacherLesson(item: TeacherLesson, date: string, appUrl: string): string {
  const lines = [richLesson(item.entry, { showTeacher: false })];
  if (item.groupName) lines.push(`👥 <b>${escapeHtml(item.groupName)}</b>`);
  if (item.slug) {
    const url = attendanceUrl(appUrl, item.slug, date, item.entry.slot);
    lines.push(`<a href="${escapeHtml(url)}">🔗 Davomatni ochish</a>`);
  }
  return lines.join("\n");
}

export function richWeekLesson(entry: RichEntry): string {
  const time = SLOT_TIMES[entry.slot];
  const parts = [
    `🕘 <b>${entry.slot}-par</b>${time ? ` ${time}` : ""}`,
    `📚 <b>${escapeHtml(entry.subject)}</b>`,
  ];
  if (entry.lessonType) parts.push(`🏷 ${escapeHtml(entry.lessonType)}`);
  if (entry.room) parts.push(`🚪 ${escapeHtml(entry.room)}`);
  if (entry.teacher) parts.push(`👨‍🏫 ${escapeHtml(entry.teacher)}`);
  const groupName = entry.groupName ?? entry.group?.name ?? "";
  if (groupName) parts.push(`👥 ${escapeHtml(groupName)}`);
  const lines = [`• ${parts.join(" · ")}`];
  const status = STATUS_LABELS[entry.status ?? ""] ?? "";
  if (status) lines.push(`   <i>${status}</i>`);
  return lines.join("\n");
}

function mondayParts(date: Date) {
  const parts = tashkentParts(date);
  const copy = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const offset = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - offset);
  return copy;
}

function shortDate(date: Date): string {
  return `${pad2(date.getUTCDate())}.${pad2(date.getUTCMonth() + 1)}`;
}

export function weekRange(date: Date): string {
  const monday = mondayParts(date);
  const saturday = new Date(monday);
  saturday.setUTCDate(monday.getUTCDate() + 5);
  return `${shortDate(monday)} – ${shortDate(saturday)}.${saturday.getUTCFullYear()}`;
}

export function weekText(groupName: string, entries: RichEntry[], today: number): string {
  const lines = [
    `📅 <b>Haftalik jadval</b> — <b>${escapeHtml(groupName)}</b>`,
    `🗓 ${weekRange(new Date())}`,
    SEPARATOR,
    "",
  ];
  if (entries.length === 0) {
    lines.push("📭 <i>Bu hafta darslar yo'q.</i>");
    return lines.join("\n");
  }
  for (let day = 1; day <= 6; day += 1) {
    const dayEntries = entries.filter((entry) => entry.dayOfWeek === day);
    if (dayEntries.length === 0) continue;
    lines.push(`📌 <b>${DAY_TITLES[day]}</b>${day === today ? " (bugun)" : ""}`);
    for (const entry of dayEntries) lines.push(richWeekLesson(entry));
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function normalizeTeacher(name: string): string {
  return name.replace(/\./g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCourseSlug(
  subject: string,
  courses: { title: string; slug: string }[],
): string | null {
  const subjectTokens = new Set(normalizeTitle(subject).split(" "));
  let bestSlug: string | null = null;
  let bestScore = 0;
  for (const course of courses) {
    const score = normalizeTitle(course.title)
      .split(" ")
      .filter((token) => token.length >= 3 && subjectTokens.has(token)).length;
    if (score > bestScore) {
      bestScore = score;
      bestSlug = course.slug;
    }
  }
  return bestScore > 0 ? bestSlug : null;
}

export function attendanceUrl(appUrl: string, slug: string, date: string, slot: number): string {
  return `${appUrl}/courses/${slug}/attendance/lesson?date=${date}&slot=${slot}`;
}

function examDateLine(exam: DailyExam): string {
  if (!exam.date) return "";
  const parts = tashkentParts(exam.date);
  const time = exam.time ? ` · 🕘 ${escapeHtml(exam.time)}` : "";
  return `🗓 <b>${formatDateUz(exam.date)}</b> (${DAY_TITLES[parts.jsDay]})${time}`;
}

export function richExamReminder(exam: DailyExam): string {
  const dateLine = examDateLine(exam);
  const lines: string[] = dateLine ? [dateLine] : [];
  lines.push(`📚 <b>${escapeHtml(exam.course)}</b> — ${escapeHtml(exam.title)}`);
  const info: string[] = [];
  if (exam.room) info.push(`🚪 ${escapeHtml(exam.room)}`);
  if (!dateLine && exam.time) info.push(`🕘 ${escapeHtml(exam.time)}`);
  if (exam.seat) info.push(`🎫 O'rindiq: ${escapeHtml(exam.seat)}`);
  if (info.length > 0) lines.push(info.join(" · "));
  lines.push(exam.permitted ? "✅ <i>Ruxsat bor</i>" : "❌ <i>Ruxsat yo'q</i>");
  return lines.join("\n");
}

export function richTeacherExam(exam: DailyExam): string {
  const dateLine = examDateLine(exam);
  const lines: string[] = dateLine ? [dateLine] : [];
  lines.push(`📚 <b>${escapeHtml(exam.course)}</b> — ${escapeHtml(exam.title)}`);
  const info: string[] = [];
  if (exam.room) info.push(`🚪 ${escapeHtml(exam.room)}`);
  if (!dateLine && exam.time) info.push(`🕘 ${escapeHtml(exam.time)}`);
  if (info.length > 0) lines.push(info.join(" · "));
  lines.push(`🗂 ${exam.sheets ?? 0} varaq, ${exam.graded ?? 0} natija kiritilgan`);
  return lines.join("\n");
}

export function dailyReminderText(
  user: DailyUser,
  day: Date,
  lessons: RichEntry[],
  deadlines: DailyDeadline[],
  teacherLessons: TeacherLesson[] = [],
  exams: DailyExam[] = [],
  appUrl = "https://fbsu.vercel.app",
): string {
  const parts = tashkentParts(day);
  const lines = [
    "🎓 <b>Bugungi darslar</b>",
    `📅 <b>${DAY_TITLES[parts.jsDay]}</b>, ${formatDateUz(day)}`,
  ];
  if (user.group) lines.push(`👥 Guruh: <b>${escapeHtml(user.group.name)}</b>`);
  lines.push(SEPARATOR, "");
  lines.push("📌 <b>Darslar</b>");
  if (user.role === "TEACHER" && teacherLessons.length > 0) {
    for (const item of teacherLessons) {
      lines.push(richTeacherLesson(item, dateKey(day), appUrl));
      lines.push("");
    }
    lines.push("⏰ <b>Davomatni belgilashni unutmang.</b>");
    const first = teacherLessons.find((item) => item.slug);
    if (first) {
      const url = attendanceUrl(appUrl, first.slug ?? "", dateKey(day), first.entry.slot);
      lines.push(`<a href="${escapeHtml(url)}">🔗 Birinchi dars davomati</a>`);
    }
  } else if (lessons.length > 0) {
    lines.push(richEntries(lessons));
  } else {
    lines.push(
      parts.jsDay === 0
        ? "🎉 <i>Dam kuni — darslar yo'q.</i>"
        : "📭 <i>Bugun darslar yo'q.</i>",
    );
  }
  if (exams.length > 0) {
    lines.push("");
    lines.push("📝 <b>Bugungi imtihonlar</b>");
    for (const exam of exams) {
      lines.push(user.role === "TEACHER" ? richTeacherExam(exam) : richExamReminder(exam));
    }
  }
  lines.push("");
  lines.push("⏰ <b>Bugungi muddatlar</b>");
  if (deadlines.length === 0) {
    lines.push("📌 <i>Bugun deadline yo'q.</i>");
  } else {
    lines.push("<blockquote expandable>");
    for (const item of deadlines) {
      lines.push(`📌 ${escapeHtml(item.text)} <i>(${timeText(item.dueAt)})</i>`);
    }
    lines.push("</blockquote>");
  }
  return lines.join("\n");
}
