import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { securityEventCount } from "./ai-core.mjs";
import {
  buildDeanReport,
  buildSecurityAlert,
  buildStudentAlert,
  buildTeacherReport,
  collectSecurityEvents,
} from "./insights.mjs";

const BOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(BOT_DIR, "..");

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(ROOT_DIR, ".env"));
  }
} catch {}

const DATA_FILE = path.join(BOT_DIR, "data.json");
const PENDING_FILE = path.join(BOT_DIR, "pending.json");
const POLL_TIMEOUT = 30;
const RETRY_DELAY_MS = 5000;

const SLOT_TIMES = {
  1: "09:00–10:20",
  2: "10:30–11:50",
  3: "12:00–13:20",
  4: "14:20–15:40",
  5: "15:50–17:10",
  6: "17:20–18:40",
  7: "18:50–20:10",
  8: "20:20–21:40",
};

const DAY_NAMES = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const DAY_TITLES = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const SEPARATOR = "━━━━━━━━━━━━━━━━━━";

const CODE_RE = /^\d{6}$/;
const APP_URL = (process.env.FBSU_APP_URL ?? "https://fbsu.vercel.app").trim().replace(/\/+$/, "");
const APP_BUTTON = {
  reply_markup: {
    inline_keyboard: [[{ text: "📱 FBSU'ni ochish", web_app: { url: APP_URL } }]],
  },
};
const REMINDER_BUTTONS = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "📱 FBSU'ni ochish", web_app: { url: APP_URL } }],
      [{ text: "📅 Haftalik jadval", web_app: { url: `${APP_URL}/schedule` } }],
    ],
  },
};
const MESSAGE_EFFECTS = {
  confetti: "5046509860389126442",
  fire: "5104841245755180586",
};

let token = "";
let prisma = null;
let links = {};
let lastReminderDate = "";
let lastSecurityAt = "";

function loadData() {
  if (!existsSync(DATA_FILE)) return;
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    if (parsed.links && typeof parsed.links === "object" && !Array.isArray(parsed.links)) {
      links = parsed.links;
      lastReminderDate = typeof parsed.lastReminderDate === "string" ? parsed.lastReminderDate : "";
      lastSecurityAt = typeof parsed.lastSecurityAt === "string" ? parsed.lastSecurityAt : "";
      return;
    }
    links = parsed;
  } catch {}
}

function saveData() {
  const payload = { links, lastReminderDate, lastSecurityAt };
  writeFileSync(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function loadPending() {
  if (!existsSync(PENDING_FILE)) return {};
  try {
    const parsed = JSON.parse(readFileSync(PENDING_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function savePending(pending) {
  const now = Date.now();
  const active = {};
  for (const [code, entry] of Object.entries(pending)) {
    if (!entry || typeof entry !== "object") continue;
    if (typeof entry.expiresAt !== "string") continue;
    if (new Date(entry.expiresAt).getTime() <= now) continue;
    active[code] = entry;
  }
  writeFileSync(PENDING_FILE, `${JSON.stringify(active, null, 2)}\n`, "utf8");
}

function getPrisma() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

async function callApi(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!body.ok) {
    throw new Error(`Telegram ${method}: ${body.description ?? response.status}`);
  }
  return body.result;
}

async function sendMessage(chatId, text, extra = {}) {
  await callApi("sendMessage", { chat_id: chatId, text, ...extra });
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function splitText(text, limit = 3800) {
  if (text.length <= limit) return [text];
  const chunks = [];
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

async function sendRichMessage(chatId, text, extra = {}) {
  const chunks = splitText(text);
  for (let index = 0; index < chunks.length; index += 1) {
    const payload = { parse_mode: "HTML", disable_web_page_preview: true };
    if (index === 0 && extra.message_effect_id) payload.message_effect_id = extra.message_effect_id;
    if (index === chunks.length - 1 && extra.reply_markup) payload.reply_markup = extra.reply_markup;
    try {
      await sendMessage(chatId, chunks[index], payload);
    } catch (error) {
      if (!payload.message_effect_id) throw error;
      delete payload.message_effect_id;
      await sendMessage(chatId, chunks[index], payload);
    }
  }
}

async function sendTyping(chatId) {
  try {
    await callApi("sendChatAction", { chat_id: chatId, action: "typing" });
  } catch {}
}

export function slotTime(slot) {
  return SLOT_TIMES[slot] ?? "";
}

export function formatLesson(entry) {
  const time = SLOT_TIMES[entry.slot];
  const head = `🕘 ${entry.slot}-par${time ? ` ${time}` : ""}`;
  const parts = [head, `📚 ${entry.subject}`];
  if (entry.room) parts.push(`🚪 ${entry.room}`);
  if (entry.teacher) parts.push(`👨‍🏫 ${entry.teacher}`);
  return parts.join(" | ");
}

export function formatEntries(entries) {
  return entries
    .map((entry) => {
      const lines = [formatLesson(entry)];
      const label = STATUS_LABELS[entry.status] ?? "";
      if (label) lines.push(label);
      return lines.join("\n");
    })
    .join("\n\n");
}

const STATUS_LABELS = {
  NORMAL: "",
  CHANGED: "🔄 O'zgartirilgan",
  MOVED: "➡️ Ko'chirilgan",
  CANCELLED: "❌ Bekor qilindi",
};

export function richLesson(entry, options = {}) {
  const showTeacher = options.showTeacher !== false;
  const time = SLOT_TIMES[entry.slot];
  const lines = [`🕘 <b>${entry.slot}-par</b>${time ? ` · ${time}` : ""}`];
  lines.push(`📚 <b>${escapeHtml(entry.subject)}</b>`);
  const meta = [];
  if (entry.lessonType) meta.push(`🏷 ${escapeHtml(entry.lessonType)}`);
  if (entry.room) meta.push(`🚪 ${escapeHtml(entry.room)}`);
  if (showTeacher && entry.teacher) meta.push(`👨‍🏫 ${escapeHtml(entry.teacher)}`);
  if (meta.length > 0) lines.push(meta.join(" · "));
  if (entry.note) lines.push(`📝 <i>${escapeHtml(entry.note)}</i>`);
  const status = STATUS_LABELS[entry.status] ?? "";
  if (status) lines.push(`<i>${status}</i>`);
  return lines.join("\n");
}

export function richEntries(entries) {
  return entries.map((entry) => richLesson(entry)).join("\n\n");
}

function richTeacherLesson(item, date) {
  const lines = [richLesson(item.entry, { showTeacher: false })];
  if (item.groupName) lines.push(`👥 <b>${escapeHtml(item.groupName)}</b>`);
  if (item.slug) {
    const url = attendanceUrl(item.slug, date, item.entry.slot);
    lines.push(`<a href="${escapeHtml(url)}">🔗 Davomatni ochish</a>`);
  }
  return lines.join("\n");
}

export function formatWeekLesson(entry) {
  const lines = [`• ${formatLesson(entry)}`];
  const label = STATUS_LABELS[entry.status] ?? "";
  if (label) lines.push(`   ${label}`);
  return lines.join("\n");
}

function mondayDate(date) {
  const copy = new Date(date);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function shortDate(date) {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}`;
}

function weekRange(date) {
  const monday = mondayDate(date);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return `${shortDate(monday)} – ${shortDate(saturday)}.${saturday.getFullYear()}`;
}

export function richWeekLesson(entry) {
  const time = SLOT_TIMES[entry.slot];
  const parts = [
    `🕘 <b>${entry.slot}-par</b>${time ? ` ${time}` : ""}`,
    `📚 <b>${escapeHtml(entry.subject)}</b>`,
  ];
  if (entry.lessonType) parts.push(`🏷 ${escapeHtml(entry.lessonType)}`);
  if (entry.room) parts.push(`🚪 ${escapeHtml(entry.room)}`);
  if (entry.teacher) parts.push(`👨‍🏫 ${escapeHtml(entry.teacher)}`);
  const lines = [`• ${parts.join(" · ")}`];
  const status = STATUS_LABELS[entry.status] ?? "";
  if (status) lines.push(`   <i>${status}</i>`);
  return lines.join("\n");
}

export function weekText(groupName, entries, today) {
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

export function normalizeTeacher(name) {
  return name.replace(/\./g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeTitle(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCourseSlug(subject, courses) {
  const subjectTokens = new Set(normalizeTitle(subject).split(" "));
  let bestSlug = null;
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

function attendanceUrl(slug, date, slot) {
  return `${APP_URL}/courses/${slug}/attendance/lesson?date=${date}&slot=${slot}`;
}

const REMINDER_HOUR = 7;
const REMINDER_CHECK_MS = 60 * 60 * 1000;
const EXAM_WINDOW_DAYS = 30;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function timeText(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function isoWeekNumber(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function weekParity(date) {
  return isoWeekNumber(date) % 2 === 1 ? "odd" : "even";
}

function parityFilter(date) {
  return { OR: [{ parity: null }, { parity: weekParity(date) }] };
}

async function collectReminder(user, dayStart) {
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const db = getPrisma();

  const courses = await db.course.findMany({
    where:
      user.role === "STUDENT"
        ? { enrollments: { some: { userId: user.id } } }
        : user.role === "TEACHER"
          ? { teacherId: user.id }
          : {},
    select: { id: true },
  });
  const courseIds = courses.map((course) => course.id);

  const lessons = user.groupId
    ? await db.scheduleEntry.findMany({
        where: { groupId: user.groupId, dayOfWeek: dayStart.getDay(), ...parityFilter(dayStart) },
        orderBy: { slot: "asc" },
      })
    : [];

  if (courseIds.length === 0) return { lessons, deadlines: [], exams: [] };

  const [assignments, quizzes, exams] = await Promise.all([
    db.assignment.findMany({
      where: { courseId: { in: courseIds }, dueAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { dueAt: "asc" },
      include: { course: { select: { title: true } } },
    }),
    db.quiz.findMany({
      where: {
        courseId: { in: courseIds },
        dueAt: { gte: dayStart, lt: dayEnd },
        ...(user.role === "STUDENT" ? { isPublished: true } : {}),
      },
      orderBy: { dueAt: "asc" },
      include: { course: { select: { title: true } } },
    }),
    db.examSession.findMany({
      where: { courseId: { in: courseIds }, date: { gte: dayStart, lt: dayEnd } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: {
        course: { select: { title: true } },
        sheets: { select: { status: true, score: true } },
      },
    }),
  ]);

  const deadlines = [
    ...assignments.map((assignment) => ({
      dueAt: assignment.dueAt,
      text: `Topshiriq: ${assignment.title} — ${assignment.course.title}`,
    })),
    ...quizzes.map((quiz) => ({
      dueAt: quiz.dueAt,
      text: `Test: ${quiz.title} — ${quiz.course.title}`,
    })),
  ]
    .filter((item) => item.dueAt !== null)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  return { lessons, deadlines, exams };
}

async function collectTeacherLessons(user, dayOfWeek, date = new Date()) {
  const db = getPrisma();
  const entries = await db.scheduleEntry.findMany({
    where: { dayOfWeek, ...parityFilter(date) },
    include: { group: { select: { name: true } } },
    orderBy: { slot: "asc" },
  });
  const own = entries.filter(
    (entry) => entry.teacher && normalizeTeacher(entry.teacher) === normalizeTeacher(user.name),
  );
  if (own.length === 0) return [];
  const courses = await db.course.findMany({
    where: { teacherId: user.id },
    select: { title: true, slug: true },
  });
  return own.map((entry) => ({
    entry,
    groupName: entry.group?.name ?? "",
    slug: matchCourseSlug(entry.subject, courses),
  }));
}

export function examTime(session) {
  if (!session.startTime) return "";
  return session.endTime ? `${session.startTime}–${session.endTime}` : session.startTime;
}

export function examPermission(sheet) {
  if (!sheet) return "❌ Ruxsat yo'q";
  return sheet.status === "FAILED" || sheet.status === "ABSENT" ? "❌ Ruxsat yo'q" : "✅ Ruxsat";
}

export function formatExamSession(session) {
  const date = session.date;
  const time = examTime(session);
  const head = `🗓 ${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()} (${DAY_TITLES[date.getDay()]})${time ? ` | 🕘 ${time}` : ""}`;
  const lines = [head, `📚 ${session.course.title} — ${session.title}`];
  const sheet = session.sheets?.[0] ?? null;
  const info = [];
  if (session.room) info.push(`🚪 Xona: ${session.room}`);
  if (sheet?.seat) info.push(`🎫 O'rindiq: ${sheet.seat}`);
  if (info.length > 0) lines.push(info.join(" | "));
  lines.push(examPermission(sheet));
  return lines.join("\n");
}

export function examsText(sessions) {
  if (sessions.length === 0) return "Kelayotgan imtihonlar yo'q";
  const lines = ["📝 Kelayotgan imtihonlar", SEPARATOR, ""];
  for (const session of sessions) {
    lines.push(formatExamSession(session));
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function examReminderText(session) {
  const meta = [session.room, examTime(session)].filter(Boolean).join(", ");
  return `📝 Bugun imtihon: ${session.course.title} — ${session.title}${meta ? ` (${meta})` : ""}`;
}

function gradedSheetCount(sheets) {
  return sheets.filter((sheet) => sheet.score !== null || sheet.status !== "PENDING").length;
}

export function teacherExamText(session) {
  const lines = [`• 📝 ${session.course.title} — ${session.title}`];
  const meta = [];
  if (session.room) meta.push(`🚪 ${session.room}`);
  const time = examTime(session);
  if (time) meta.push(`🕘 ${time}`);
  if (meta.length > 0) lines.push(`   ${meta.join(" | ")}`);
  lines.push(`   🗂 ${session.sheets.length} varaq, ${gradedSheetCount(session.sheets)} natija kiritilgan`);
  return lines.join("\n");
}

function richExamReminder(session) {
  const meta = [session.room, examTime(session)].filter(Boolean).join(", ");
  return `📝 <b>${escapeHtml(session.course.title)}</b> — ${escapeHtml(session.title)}${
    meta ? ` <i>(${escapeHtml(meta)})</i>` : ""
  }`;
}

function richTeacherExam(session) {
  const lines = [
    `• 📝 <b>${escapeHtml(session.course.title)}</b> — ${escapeHtml(session.title)}`,
  ];
  const meta = [];
  if (session.room) meta.push(`🚪 ${escapeHtml(session.room)}`);
  const time = examTime(session);
  if (time) meta.push(`🕘 ${time}`);
  if (meta.length > 0) lines.push(`   ${meta.join(" · ")}`);
  lines.push(`   🗂 ${session.sheets.length} varaq, ${gradedSheetCount(session.sheets)} natija kiritilgan`);
  return lines.join("\n");
}

export function reminderText(user, day, lessons, deadlines, teacherLessons = [], exams = []) {
  const lines = [
    "🎓 <b>Bugungi darslar</b>",
    `📅 <b>${DAY_TITLES[day.getDay()]}</b>, ${dateKey(day)}`,
  ];
  if (user.group) lines.push(`👥 Guruh: <b>${escapeHtml(user.group.name)}</b>`);
  lines.push(SEPARATOR, "");
  lines.push("📌 <b>Darslar</b>");
  if (user.role === "TEACHER" && teacherLessons.length > 0) {
    for (const item of teacherLessons) {
      lines.push(richTeacherLesson(item, dateKey(day)));
      lines.push("");
    }
    lines.push("⏰ <b>Davomatni belgilashni unutmang.</b>");
    const first = teacherLessons.find((item) => item.slug);
    if (first) {
      const url = attendanceUrl(first.slug, dateKey(day), first.entry.slot);
      lines.push(`<a href="${escapeHtml(url)}">🔗 Birinchi dars davomati</a>`);
    }
  } else if (lessons.length > 0) {
    lines.push(richEntries(lessons));
  } else {
    lines.push(
      day.getDay() === 0
        ? "🎉 <i>Dam kuni — darslar yo'q.</i>"
        : "📭 <i>Bugun darslar yo'q.</i>",
    );
  }
  if (exams.length > 0) {
    lines.push("");
    lines.push("📝 <b>Bugungi imtihonlar</b>");
    if (user.role === "TEACHER") {
      for (const exam of exams) lines.push(richTeacherExam(exam));
    } else {
      for (const exam of exams) lines.push(richExamReminder(exam));
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

const SECURITY_CHECK_MS = 15 * 60 * 1000;
const SECURITY_WINDOW_CAP_MS = 24 * 60 * 60 * 1000;
const AI_CONCURRENCY = 3;

async function mapLimit(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function sendAiAlerts(targets, now) {
  const list = targets.filter((target) =>
    ["STUDENT", "TEACHER", "DEKAN"].includes(target.user.role),
  );
  await mapLimit(list, AI_CONCURRENCY, async ({ chatId, user }) => {
    try {
      let text = null;
      if (user.role === "STUDENT") {
        text = await buildStudentAlert(getPrisma(), user, now);
      } else if (user.role === "DEKAN") {
        text = await buildDeanReport(getPrisma(), user, now);
      } else {
        text = await buildTeacherReport(getPrisma(), user, now);
      }
      if (!text) return;
      await sendMessage(chatId, `🧠 AI ogohlantirish\n\n${text}`);
    } catch (error) {
      console.error(`AI xabar yuborilmadi (${chatId}):`, errorText(error));
    }
  });
}

async function sendDailyReminders() {
  const now = new Date();
  if (now.getHours() !== REMINDER_HOUR) return;
  const today = dateKey(now);
  if (lastReminderDate === today) return;

  const dayStart = startOfDay(now);
  const targets = [];
  for (const [chatId, email] of Object.entries(links)) {
    if (typeof email !== "string") continue;
    try {
      const user = await getPrisma().user.findUnique({
        where: { email },
        include: { group: true },
      });
      if (!user) continue;
      const { lessons, deadlines, exams } = await collectReminder(user, dayStart);
      const teacherLessons =
        user.role === "TEACHER" ? await collectTeacherLessons(user, now.getDay(), now) : [];
      const hasContent =
        lessons.length > 0 ||
        teacherLessons.length > 0 ||
        deadlines.length > 0 ||
        exams.length > 0;
      const effect = exams.length > 0
        ? MESSAGE_EFFECTS.fire
        : hasContent
          ? MESSAGE_EFFECTS.confetti
          : null;
      await sendTyping(chatId);
      await sendRichMessage(chatId, reminderText(user, now, lessons, deadlines, teacherLessons, exams), {
        ...REMINDER_BUTTONS,
        ...(effect ? { message_effect_id: effect } : {}),
      });
      targets.push({ chatId, user });
    } catch (error) {
      console.error(`Eslatma yuborilmadi (${chatId}):`, errorText(error));
    }
  }

  lastReminderDate = today;
  saveData();
  await sendAiAlerts(targets, now);
}

async function sendSecurityAlerts() {
  const ownerChatId = (process.env.OWNER_TELEGRAM_ID ?? "").trim();
  if (!token || !ownerChatId) return;
  const now = new Date();
  const capped = new Date(now.getTime() - SECURITY_WINDOW_CAP_MS);
  const previous = lastSecurityAt ? new Date(lastSecurityAt) : null;
  const since = previous && previous.getTime() > capped.getTime() ? previous : capped;
  const events = await collectSecurityEvents(getPrisma(), since, now);
  if (securityEventCount(events) === 0) {
    lastSecurityAt = now.toISOString();
    saveData();
    return;
  }
  const text = await buildSecurityAlert(events, since, now);
  if (text) await sendMessage(ownerChatId, `🔐 AI xavfsizlik xulosasi\n\n${text}`);
  lastSecurityAt = now.toISOString();
  saveData();
}

function startSecurityLoop() {
  const run = () => {
    void sendSecurityAlerts().catch((error) =>
      console.error("Xavfsizlik tekshiruvi xatosi:", errorText(error)),
    );
  };
  run();
  setInterval(run, SECURITY_CHECK_MS);
}

function startReminderLoop() {
  const run = () => {
    void sendDailyReminders().catch((error) =>
      console.error("Eslatma tekshiruvi xatosi:", errorText(error)),
    );
  };
  run();
  setInterval(run, REMINDER_CHECK_MS);
}

async function sendAiInsight(chatId) {
  const email = links[String(chatId)];
  if (!email) {
    await sendMessage(
      chatId,
      "Avval saytdagi Sozlamalar → Aloqa bo'limidan 6 xonali kod olib, shu yerga yuboring.",
    );
    return;
  }
  const user = await getPrisma().user.findUnique({ where: { email }, include: { group: true } });
  if (!user) {
    delete links[String(chatId)];
    saveData();
    await sendMessage(chatId, "Bog'langan foydalanuvchi bazadan topilmadi. Saytdan yangi kod oling.");
    return;
  }
  if (user.role === "OWNER") {
    await sendOwnerSecurity(chatId);
    return;
  }
  let text = null;
  if (user.role === "STUDENT") text = await buildStudentAlert(getPrisma(), user);
  else if (user.role === "TEACHER") text = await buildTeacherReport(getPrisma(), user);
  else if (user.role === "DEKAN") text = await buildDeanReport(getPrisma(), user);
  else {
    await sendMessage(chatId, "ℹ️ AI tahlil talabalar, o'qituvchilar va dekanlar uchun mavjud.");
    return;
  }
  if (!text) {
    await sendMessage(
      chatId,
      "🧠 Hozircha jiddiy xavf topilmadi — davomat, baholar, muddatlar va imtihonlar joyida.",
    );
    return;
  }
  await sendMessage(chatId, `🧠 AI tahlil\n\n${text}`);
}

async function sendOwnerSecurity(chatId) {
  const ownerChatId = (process.env.OWNER_TELEGRAM_ID ?? "").trim();
  if (!ownerChatId || String(chatId) !== ownerChatId) {
    await sendMessage(chatId, "⛔ Bu buyruq faqat OWNER uchun.");
    return;
  }
  const now = new Date();
  const since = new Date(now.getTime() - SECURITY_WINDOW_CAP_MS);
  const events = await collectSecurityEvents(getPrisma(), since, now);
  if (securityEventCount(events) === 0) {
    await sendMessage(chatId, "🔐 Oxirgi 24 soatda xavfli hodisa yo'q.");
    return;
  }
  const text = await buildSecurityAlert(events, since, now);
  await sendMessage(
    chatId,
    text
      ? `🔐 AI xavfsizlik xulosasi\n\n${text}`
      : "🔐 Oxirgi 24 soatda jiddiy xavf aniqlanmadi.",
  );
}

const HELP_TEXT = [
  "📋 Buyruqlar:",
  "• /start — boshlash va tasdiqlash kodi haqida ma'lumot",
  "• /app — FBSU'ni Telegram ichida ochish (mini ilova)",
  "• /jadval — bugungi darslar",
  "• /ertaga — ertangi darslar",
  "• /hafta — haftalik jadval (kun-kun)",
  "• /davomat — o'qituvchilar uchun bugungi darslar va davomat havolalari",
  "• /imtihon — kelayotgan imtihonlar (30 kun)",
  "• /ai — shaxsiy AI tahlil (davomat, baholar, muddatlar)",
  "• /xavfsizlik — oxirgi 24 soat xavfsizlik xulosasi (faqat OWNER)",
  "• /help — shu yordam",
  "",
  "🔐 Bog'lanish uchun saytga kirib, Sozlamalar → Aloqa bo'limidan 6 xonali kod oling va shu yerga yuboring.",
].join("\n");

function startText(name) {
  return [
    `👋 Salom${name ? `, ${name}` : ""}! Men FBSU jadval botiman.`,
    "📚 Guruh jadvali, haftalik darslar va o'qituvchilar uchun davomat — hammasi shu yerda.",
    "",
    "Nimalar qila olaman:",
    "• /app — FBSU'ni Telegram ichida ochish",
    "• /jadval — bugungi darslar",
    "• /ertaga — ertangi darslar",
    "• /hafta — haftalik jadval",
    "• /davomat — o'qituvchilar uchun davomat havolalari",
    "• /ai — shaxsiy AI tahlil",
    "• /help — yordam",
    "",
    "🔐 Boshlash uchun saytga kirib, Sozlamalar → Aloqa bo'limidan 6 xonali kod oling va shu yerga yuboring.",
  ].join("\n");
}

function parseCommand(text) {
  const first = text.trim().split(/\s+/)[0];
  if (!first.startsWith("/")) return null;
  return first.slice(1).split("@")[0].toLowerCase();
}

async function linkCode(chatId, code) {
  const pending = loadPending();
  const entry = pending[code];
  if (!entry || typeof entry !== "object" || typeof entry.email !== "string") {
    await sendMessage(chatId, "❌ Kod topilmadi yoki eskirgan. Saytdagi Sozlamalar bo'limidan yangi kod oling.");
    return;
  }
  if (typeof entry.expiresAt !== "string" || new Date(entry.expiresAt).getTime() <= Date.now()) {
    delete pending[code];
    savePending(pending);
    await sendMessage(chatId, "❌ Kod muddati tugagan. Saytdagi Sozlamalar bo'limidan yangi kod oling.");
    return;
  }
  const user =
    typeof entry.userId === "string"
      ? await getPrisma().user.findUnique({ where: { id: entry.userId }, include: { group: true } })
      : await getPrisma().user.findUnique({ where: { email: entry.email }, include: { group: true } });
  if (!user) {
    delete pending[code];
    savePending(pending);
    await sendMessage(chatId, `"${entry.email}" bazada topilmadi. Saytdagi Sozlamalar bo'limidan yangi kod oling.`);
    return;
  }
  links[String(chatId)] = user.email;
  delete pending[code];
  savePending(pending);
  saveData();
  const groupLine = user.group
    ? `Guruh: ${user.group.name}.`
    : "Sizga guruh biriktirilmagan, /jadval ishlamaydi.";
  await sendMessage(
    chatId,
    `✅ Saqlandi: ${user.name} (${user.email}).\n${groupLine}\n\nEndi /jadval bilan bugungi darslarni ko'ring.`,
  );
}

async function sendSchedule(chatId, dayOffset) {
  const email = links[String(chatId)];
  if (!email) {
    await sendMessage(chatId, "Avval email manzilingizni yuboring (masalan: ozodbek@ttpu.uz).");
    return;
  }
  const user = await getPrisma().user.findUnique({ where: { email }, include: { group: true } });
  if (!user) {
    delete links[String(chatId)];
    saveData();
    await sendMessage(chatId, "Bog'langan foydalanuvchi bazadan topilmadi. Emailni qayta yuboring.");
    return;
  }
  if (!user.group) {
    await sendMessage(chatId, "Sizga guruh biriktirilmagan, jadval mavjud emas.");
    return;
  }

  const target = new Date();
  target.setDate(target.getDate() + dayOffset);
  const dayOfWeek = target.getDay();
  const label = dayOffset === 0 ? "Bugun" : "Ertaga";
  const header = `📅 <b>${label}</b> — <b>${DAY_TITLES[dayOfWeek]}</b>, ${dateKey(target)}\n👥 Guruh: <b>${escapeHtml(user.group.name)}</b>`;

  await sendTyping(chatId);
  if (dayOfWeek === 0) {
    await sendRichMessage(chatId, `${header}\n\n🎉 <i>Dam kuni — darslar yo'q.</i>`, APP_BUTTON);
    return;
  }

  const entries = await getPrisma().scheduleEntry.findMany({
    where: { groupId: user.groupId, dayOfWeek, ...parityFilter(target) },
    orderBy: { slot: "asc" },
  });
  if (entries.length === 0) {
    await sendRichMessage(chatId, `${header}\n\n📭 <i>Darslar yo'q.</i>`, APP_BUTTON);
    return;
  }
  await sendRichMessage(chatId, `${header}\n${SEPARATOR}\n\n${richEntries(entries)}`, APP_BUTTON);
}

async function sendWeek(chatId) {
  const email = links[String(chatId)];
  if (!email) {
    await sendMessage(chatId, "Avval email manzilingizni yuboring (masalan: ozodbek@ttpu.uz).");
    return;
  }
  const user = await getPrisma().user.findUnique({ where: { email }, include: { group: true } });
  if (!user) {
    delete links[String(chatId)];
    saveData();
    await sendMessage(chatId, "Bog'langan foydalanuvchi bazadan topilmadi. Emailni qayta yuboring.");
    return;
  }
  if (!user.group) {
    await sendMessage(chatId, "Sizga guruh biriktirilmagan, jadval mavjud emas.");
    return;
  }

  const entries = await getPrisma().scheduleEntry.findMany({
    where: { groupId: user.groupId, dayOfWeek: { gte: 1, lte: 6 }, ...parityFilter(new Date()) },
    orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
  });
  await sendTyping(chatId);
  await sendRichMessage(chatId, weekText(user.group.name, entries, new Date().getDay()), APP_BUTTON);
}

async function sendAttendance(chatId) {
  const email = links[String(chatId)];
  if (!email) {
    await sendMessage(chatId, "Avval email manzilingizni yuboring (masalan: ozodbek@ttpu.uz).");
    return;
  }
  const user = await getPrisma().user.findUnique({ where: { email }, include: { group: true } });
  if (!user) {
    delete links[String(chatId)];
    saveData();
    await sendMessage(chatId, "Bog'langan foydalanuvchi bazadan topilmadi. Emailni qayta yuboring.");
    return;
  }
  if (user.role !== "TEACHER") {
    await sendMessage(chatId, "ℹ️ Bu buyruq o'qituvchilar uchun. Bugungi jadvalingiz:");
    await sendSchedule(chatId, 0);
    return;
  }

  const today = new Date();
  const dayOfWeek = today.getDay();
  const date = dateKey(today);
  const header = `🔔 <b>Davomat</b> — bugun, ${DAY_NAMES[dayOfWeek]}, ${date}`;
  const items = await collectTeacherLessons(user, dayOfWeek, today);
  if (items.length === 0) {
    await sendMessage(chatId, `${header}\n\n📭 Bugun darslaringiz yo'q.`);
    return;
  }
  const lines = [header, SEPARATOR, ""];
  for (const item of items) {
    lines.push(richTeacherLesson(item, date));
    lines.push("");
  }
  lines.push("⏰ <b>Davomatni belgilashni unutmang!</b>");
  await sendTyping(chatId);
  await sendRichMessage(chatId, lines.join("\n"), APP_BUTTON);
}

async function sendExams(chatId) {
  const email = links[String(chatId)];
  if (!email) {
    await sendMessage(chatId, "Avval email manzilingizni yuboring (masalan: ozodbek@ttpu.uz).");
    return;
  }
  const user = await getPrisma().user.findUnique({ where: { email } });
  if (!user) {
    delete links[String(chatId)];
    saveData();
    await sendMessage(chatId, "Bog'langan foydalanuvchi bazadan topilmadi. Emailni qayta yuboring.");
    return;
  }

  const from = startOfDay(new Date());
  const until = new Date(from);
  until.setDate(until.getDate() + EXAM_WINDOW_DAYS);
  until.setHours(23, 59, 59, 999);

  const sessions = await getPrisma().examSession.findMany({
    where: {
      date: { gte: from, lte: until },
      course: { enrollments: { some: { userId: user.id } } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      course: { select: { title: true } },
      sheets: { where: { studentId: user.id }, select: { seat: true, status: true } },
    },
  });
  await sendMessage(chatId, examsText(sessions));
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text ?? "").trim();
  if (!text) return;
  const command = parseCommand(text);

  if (command === "start") {
    await sendMessage(chatId, startText(message.from?.first_name ?? ""), APP_BUTTON);
    return;
  }
  if (command === "app") {
    await sendMessage(
      chatId,
      "📱 FBSU mini ilovasi — jadval, baholar, davomat va imtihonlar bir joyda.",
      APP_BUTTON,
    );
    return;
  }
  if (command === "help") {
    await sendMessage(chatId, HELP_TEXT);
    return;
  }
  if (command === "jadval") {
    await sendSchedule(chatId, 0);
    return;
  }
  if (command === "ertaga") {
    await sendSchedule(chatId, 1);
    return;
  }
  if (command === "hafta") {
    await sendWeek(chatId);
    return;
  }
  if (command === "davomat") {
    await sendAttendance(chatId);
    return;
  }
  if (command === "imtihon") {
    await sendExams(chatId);
    return;
  }
  if (command === "ai") {
    await sendAiInsight(chatId);
    return;
  }
  if (command === "xavfsizlik") {
    await sendOwnerSecurity(chatId);
    return;
  }
  if (command) {
    await sendMessage(chatId, `Noma'lum buyruq: /${command}.\n\n${HELP_TEXT}`);
    return;
  }
  if (CODE_RE.test(text)) {
    await linkCode(chatId, text);
    return;
  }
  await sendMessage(
    chatId,
    "Tushunmadim. Saytdan olingan 6 xonali tasdiqlash kodini yuboring yoki /help ni ko'ring.",
  );
}

async function poll() {
  let offset = 0;
  try {
    const last = await callApi("getUpdates", { offset: -1, timeout: 0 });
    if (last.length > 0) offset = last[last.length - 1].update_id + 1;
  } catch (error) {
    console.error("Boshlang'ich offset olinmadi:", errorText(error));
  }

  for (;;) {
    try {
      const updates = await callApi("getUpdates", {
        offset,
        timeout: POLL_TIMEOUT,
        allowed_updates: ["message"],
      });
      for (const update of updates) {
        offset = update.update_id + 1;
        if (!update.message) continue;
        try {
          await handleMessage(update.message);
        } catch (error) {
          console.error("Xabarni qayta ishlashda xato:", errorText(error));
        }
      }
    } catch (error) {
      console.error(`Polling xatosi: ${errorText(error)}. ${RETRY_DELAY_MS / 1000}s kutib qayta urinaman.`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

async function main() {
  token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) {
    console.error("Xato: TELEGRAM_BOT_TOKEN topilmadi.");
    console.error("Tokenni loyiha ildizidagi .env fayliga qo'shing yoki quyidagicha ishga tushiring:");
    console.error("  TELEGRAM_BOT_TOKEN=<token> node bot/telegram.mjs");
    process.exit(1);
  }
  loadData();
  if (!lastSecurityAt) {
    lastSecurityAt = new Date().toISOString();
    saveData();
  }

  prisma = new PrismaClient();
  await prisma.$connect();
  console.log("Telegram bot ishga tushdi. To'xtatish: Ctrl+C");
  startReminderLoop();
  startSecurityLoop();
  await poll();
}

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  main().catch((error) => {
    console.error("Bot to'xtadi:", errorText(error));
    process.exit(1);
  });
}
