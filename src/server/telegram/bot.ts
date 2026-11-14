import "server-only";
import type { Group, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SEPARATOR,
  escapeHtml,
  matchCourseSlug,
  normalizeTeacher,
  parityFilter,
  richEntries,
  richExamReminder,
  richTeacherExam,
  richTeacherLesson,
  tashkentNow,
  tashkentStartOfDay,
  weekText,
  type DailyExam,
  type RichEntry,
  type TeacherLesson,
} from "./rich";
import {
  appKeyboard,
  appUrl,
  reminderKeyboard,
  sendBotMessage,
  sendRichBotMessage,
  sendTyping,
  telegramConfigured,
} from "./send";

export { telegramConfigured };

const CODE_RE = /^\d{6}$/;
const EXAM_WINDOW_DAYS = 30;

const HELP_TEXT = [
  "📋 Buyruqlar:",
  "• /app — FBSU mini ilovasini ochish",
  "• Har kuni ertalab — darslar, imtihonlar va muddatlar avtomatik",
  "• /ai — Fariza AI yordamchisini ochish",
  "• /jadval — bugungi darslar",
  "• /ertaga — ertangi darslar",
  "• /hafta — haftalik jadval",
  "• /davomat — o'qituvchilar uchun bugungi darslar",
  "• /imtihon — kelayotgan imtihonlar (30 kun)",
  "• /help — shu yordam",
  "",
  "🔐 Bog'lanish: saytda Sozlamalar → Aloqa bo'limidan 6 xonali kod oling va shu yerga yuboring.",
].join("\n");

type LinkedUser = User & { group: Group | null };

type EntryRow = {
  dayOfWeek: number;
  slot: number;
  subject: string;
  room: string | null;
  teacher: string | null;
  lessonType: string | null;
  note: string | null;
  status: string;
  group?: { name: string } | null;
};

export type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    from?: { id?: number; first_name?: string; username?: string };
    chat?: { id?: number };
    text?: string;
  };
};

function dayHeader(user: LinkedUser, now: ReturnType<typeof tashkentNow>, label: string): string {
  const lines = [
    `🎓 <b>${label}</b>`,
    `📅 <b>${now.title}</b>, ${now.dateLabel}`,
  ];
  if (user.group) lines.push(`👥 Guruh: <b>${escapeHtml(user.group.name)}</b>`);
  lines.push(SEPARATOR, "");
  return lines.join("\n");
}

function toRichEntry(entry: EntryRow): RichEntry {
  return {
    dayOfWeek: entry.dayOfWeek,
    slot: entry.slot,
    subject: entry.subject,
    room: entry.room,
    teacher: entry.teacher,
    lessonType: entry.lessonType,
    note: entry.note,
    status: entry.status,
    groupName: entry.group?.name ?? null,
  };
}

async function findLinkedUser(telegramId: string): Promise<LinkedUser | null> {
  return prisma.user.findUnique({ where: { telegramId }, include: { group: true } });
}

const ENTRY_SELECT = {
  dayOfWeek: true,
  slot: true,
  subject: true,
  room: true,
  teacher: true,
  lessonType: true,
  note: true,
  status: true,
  group: { select: { name: true } },
} as const;

async function teacherLessonItems(user: LinkedUser, entries: EntryRow[]): Promise<TeacherLesson[]> {
  const courses = await prisma.course.findMany({
    where: { teacherId: user.id },
    select: { title: true, slug: true },
  });
  return entries.map((entry) => ({
    entry: toRichEntry(entry),
    groupName: entry.group?.name ?? "",
    slug: matchCourseSlug(entry.subject, courses),
  }));
}

async function scheduleMessage(user: LinkedUser, offsetDays: number): Promise<string> {
  const now = tashkentNow(offsetDays);
  const dayDate = tashkentStartOfDay(offsetDays);
  const label = offsetDays === 0 ? "Bugungi darslar" : "Ertangi darslar";
  const header = dayHeader(user, now, label);
  if (now.dow === 7) return `${header}🎉 <i>Dam kuni — darslar yo'q.</i>`;

  const forTeacher = user.role === "TEACHER";
  if (!forTeacher && !user.groupId) {
    return `${header}Sizga guruh biriktirilmagan — jadval mavjud emas.`;
  }

  if (forTeacher) {
    const dayRows = await prisma.scheduleEntry.findMany({
      where: { dayOfWeek: now.dow, ...parityFilter(dayDate) },
      orderBy: { slot: "asc" },
      select: ENTRY_SELECT,
    });
    const own = dayRows.filter(
      (entry) =>
        entry.teacher &&
        normalizeTeacher(entry.teacher) === normalizeTeacher(user.name) &&
        entry.status !== "CANCELLED",
    );
    if (own.length === 0) return `${header}📭 <i>Bugun darslaringiz yo'q.</i>`;
    const items = await teacherLessonItems(user, own as EntryRow[]);
    const body = items.map((item) => richTeacherLesson(item, now.iso, appUrl())).join("\n\n");
    return `${header}📌 <b>Darslar</b>\n${body}`;
  }

  const entries = (await prisma.scheduleEntry.findMany({
    where: {
      groupId: user.groupId ?? "",
      dayOfWeek: now.dow,
      status: { not: "CANCELLED" },
      ...parityFilter(dayDate),
    },
    orderBy: { slot: "asc" },
    select: ENTRY_SELECT,
  })) as EntryRow[];
  if (entries.length === 0) return `${header}📭 <i>Bugun darslar yo'q.</i>`;
  return `${header}📌 <b>Darslar</b>\n${richEntries(entries.map(toRichEntry))}`;
}

async function weekMessage(user: LinkedUser): Promise<string> {
  const forTeacher = user.role === "TEACHER";
  if (!forTeacher && !user.groupId) {
    return "Sizga guruh biriktirilmagan — jadval mavjud emas.";
  }
  const today = new Date();
  const rows = (await prisma.scheduleEntry.findMany({
    where: {
      ...(forTeacher ? {} : { groupId: user.groupId ?? "" }),
      dayOfWeek: { gte: 1, lte: 6 },
      status: { not: "CANCELLED" },
      ...parityFilter(today),
    },
    orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
    select: ENTRY_SELECT,
  })) as EntryRow[];
  const entries = forTeacher
    ? rows.filter(
        (entry) =>
          entry.teacher && normalizeTeacher(entry.teacher) === normalizeTeacher(user.name),
      )
    : rows;
  const title = forTeacher ? user.name : (user.group?.name ?? "");
  const rich = entries.map((entry) => {
    const item = toRichEntry(entry);
    return forTeacher ? item : { ...item, groupName: null };
  });
  return weekText(title, rich, tashkentNow().dow);
}

async function attendanceMessage(user: LinkedUser): Promise<string> {
  if (user.role !== "TEACHER") {
    return `ℹ️ Bu buyruq o'qituvchilar uchun.\n\n${await scheduleMessage(user, 0)}`;
  }
  const now = tashkentNow();
  const header = dayHeader(user, now, "🔔 Bugungi davomat");
  if (now.dow === 7) return `${header}🎉 <i>Dam kuni — darslar yo'q.</i>`;
  const dayRows = (await prisma.scheduleEntry.findMany({
    where: { dayOfWeek: now.dow, status: { not: "CANCELLED" }, ...parityFilter(tashkentStartOfDay(0)) },
    orderBy: { slot: "asc" },
    select: ENTRY_SELECT,
  })) as EntryRow[];
  const own = dayRows.filter(
    (entry) => entry.teacher && normalizeTeacher(entry.teacher) === normalizeTeacher(user.name),
  );
  if (own.length === 0) return `${header}📭 <i>Bugun darslaringiz yo'q.</i>`;
  const items = await teacherLessonItems(user, own);
  const body = items.map((item) => richTeacherLesson(item, now.iso, appUrl())).join("\n\n");
  return `${header}📌 <b>Darslar</b>\n${body}\n\n<a href="${escapeHtml(`${appUrl()}/attendance`)}">📲 Davomat sahifasi</a>`;
}

async function examsMessage(user: LinkedUser): Promise<string> {
  const from = tashkentStartOfDay(0);
  const until = new Date(from.getTime() + EXAM_WINDOW_DAYS * 86_400_000);
  const sessions = await prisma.examSession.findMany({
    where:
      user.role === "TEACHER"
        ? { date: { gte: from, lte: until }, course: { teacherId: user.id } }
        : {
            date: { gte: from, lte: until },
            course: { enrollments: { some: { userId: user.id } } },
          },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 10,
    select: {
      date: true,
      startTime: true,
      endTime: true,
      room: true,
      title: true,
      course: { select: { title: true } },
      sheets: { select: { studentId: true, status: true, seat: true } },
    },
  });
  if (sessions.length === 0) return "📭 Keyingi 30 kunda imtihonlar topilmadi.";
  const forTeacher = user.role === "TEACHER";
  const exams: DailyExam[] = sessions.map((session) => {
    const sheet = forTeacher ? null : session.sheets.find((row) => row.studentId === user.id);
    return {
      course: session.course.title,
      title: session.title,
      date: session.date,
      room: session.room,
      time:
        session.startTime && session.endTime
          ? `${session.startTime}–${session.endTime}`
          : (session.startTime ?? ""),
      seat: sheet?.seat ?? null,
      permitted: Boolean(sheet && sheet.status !== "FAILED" && sheet.status !== "ABSENT"),
      sheets: session.sheets.length,
      graded: session.sheets.filter((row) => row.status !== "PENDING").length,
    };
  });
  const body = exams
    .map((exam) => (forTeacher ? richTeacherExam(exam) : richExamReminder(exam)))
    .join("\n\n");
  return `📝 <b>Kelayotgan imtihonlar</b> (30 kun)\n${SEPARATOR}\n\n${body}`;
}

async function linkCodeMessage(chatId: number | string, telegramId: string, code: string) {
  const record = await prisma.telegramLinkCode.findUnique({
    where: { code },
    include: { user: { include: { group: true } } },
  });
  if (!record || record.consumedAt || record.expiresAt.getTime() <= Date.now()) {
    await sendBotMessage(
      chatId,
      "❌ Kod topilmadi yoki muddati tugagan. Saytdagi Sozlamalar → Aloqa bo'limidan yangi kod oling.",
    );
    return;
  }
  const account = record.user;
  const other = await prisma.user.findFirst({
    where: { telegramId, NOT: { id: account.id } },
    select: { email: true },
  });
  if (other) {
    await sendBotMessage(chatId, "❌ Bu Telegram hisobi boshqa akkauntga bog'langan.");
    return;
  }
  if (account.telegramId && account.telegramId !== telegramId) {
    await sendBotMessage(
      chatId,
      "❌ Bu akkaunt boshqa Telegram hisobi bilan bog'langan. Avval saytdagi Sozlamalardan uni uzing.",
    );
    return;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: account.id }, data: { telegramId } }),
    prisma.telegramLinkCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
  ]);
  const groupLine = account.group
    ? `Guruh: ${account.group.name}.`
    : "Guruh biriktirilmagan.";
  await sendBotMessage(
    chatId,
    `✅ Telegram bog'landi: ${account.name}.\n${groupLine}\n\nEndi /jadval bilan bugungi darslarni ko'ring.`,
    appKeyboard(),
  );
}

async function requireLinkedUser(chatId: number | string, telegramId: string): Promise<LinkedUser | null> {
  const user = await findLinkedUser(telegramId);
  if (user) return user;
  await sendBotMessage(
    chatId,
    "🔐 Akkaunt bog'lanmagan.\n\nSaytda Sozlamalar → Aloqa bo'limidan 6 xonali kod oling va shu yerga yuboring.",
    appKeyboard(),
  );
  return null;
}

function parseCommand(text: string): string | null {
  const first = text.trim().split(/\s+/)[0];
  if (!first.startsWith("/")) return null;
  return first.slice(1).split("@")[0].toLowerCase();
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.chat?.id || !message.from?.id) return;
  const chatId = message.chat.id;
  const telegramId = String(message.from.id);
  const text = (message.text ?? "").trim();
  if (!text) return;
  const command = parseCommand(text);

  if (!command && CODE_RE.test(text)) {
    await linkCodeMessage(chatId, telegramId, text);
    return;
  }

  if (command === "start") {
    const user = await findLinkedUser(telegramId);
    const name = user?.name ?? message.from.first_name ?? "";
    const lines = [
      `👋 Salom${name ? `, ${name}` : ""}! Men FBSU botiman.`,
      "",
      user
        ? "Akkaunt bog'langan. Har kuni ertalab dars jadvali, imtihonlar va muddatlar avtomatik keladi."
        : "🔐 Akkauntni bog'lash: saytda Sozlamalar → Aloqa → kod oling va shu yerga yuboring.",
      "/jadval — bugungi darslar, /ai — Fariza yordamchisi.",
    ];
    await sendBotMessage(chatId, lines.join("\n"), appKeyboard());
    return;
  }

  if (command === "app") {
    await sendBotMessage(
      chatId,
      "📱 FBSU mini ilovasi — jadval, baholar, davomat, AI va imtihonlar bir joyda.",
      appKeyboard(),
    );
    return;
  }

  if (command === "ai") {
    await sendBotMessage(
      chatId,
      "🤖 Fariza — FBSU AI yordamchisi.\nJadval, davomat, baholar va muddatlar bo'yicha savol bering.",
      appKeyboard("/assistant", "🤖 Farizani ochish"),
    );
    return;
  }

  if (command === "help") {
    await sendBotMessage(chatId, HELP_TEXT);
    return;
  }

  if (
    command === "jadval" ||
    command === "ertaga" ||
    command === "hafta" ||
    command === "davomat" ||
    command === "imtihon"
  ) {
    const user = await requireLinkedUser(chatId, telegramId);
    if (!user) return;
    await sendTyping(chatId);
    if (command === "jadval") {
      return void (await sendRichBotMessage(chatId, await scheduleMessage(user, 0), reminderKeyboard()));
    }
    if (command === "ertaga") {
      return void (await sendRichBotMessage(chatId, await scheduleMessage(user, 1), reminderKeyboard()));
    }
    if (command === "hafta") {
      return void (await sendRichBotMessage(chatId, await weekMessage(user), reminderKeyboard()));
    }
    if (command === "davomat") {
      return void (await sendRichBotMessage(chatId, await attendanceMessage(user), reminderKeyboard()));
    }
    return void (await sendRichBotMessage(chatId, await examsMessage(user), reminderKeyboard()));
  }

  if (command) {
    await sendBotMessage(chatId, `Noma'lum buyruq: /${command}.\n\n${HELP_TEXT}`);
    return;
  }

  await sendBotMessage(
    chatId,
    "Tushunmadim. Saytdan olingan 6 xonali kodni yuboring yoki /help ni ko'ring.",
  );
}
