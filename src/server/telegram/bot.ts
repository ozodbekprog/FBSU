import "server-only";
import type { Group, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const APP_URL = (process.env.FBSU_APP_URL ?? "https://fbsu.vercel.app")
  .trim()
  .replace(/\/+$/, "");
const SEPARATOR = "━━━━━━━━━━━━━━━━━━";
const CODE_RE = /^\d{6}$/;
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const EXAM_WINDOW_DAYS = 30;

const SLOT_TIMES: Record<number, string> = {
  1: "09:00-10:20",
  2: "10:30-11:50",
  3: "12:00-13:20",
  4: "14:20-15:40",
  5: "15:50-17:10",
  6: "17:20-18:40",
  7: "18:50-20:10",
  8: "20:20-21:40",
};

const DAY_TITLES = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];

const HELP_TEXT = [
  "📋 Buyruqlar:",
  "• /app — FBSU mini ilovasini ochish",
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

function botToken(): string {
  return (process.env.TELEGRAM_MINIAPP_BOT_TOKEN ?? "").trim();
}

export function telegramConfigured(): boolean {
  return Boolean(botToken());
}

async function callApi(method: string, payload: Record<string, unknown>): Promise<unknown> {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_MINIAPP_BOT_TOKEN yo'q");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const json = (await response.json().catch(() => null)) as
    | { ok?: boolean; result?: unknown; description?: string }
    | null;
  if (!json?.ok) throw new Error(`${method}: ${json?.description ?? response.status}`);
  return json.result;
}

export async function sendBotMessage(
  chatId: number | string,
  text: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    await callApi("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(extra ?? {}),
    });
  } catch {
    // Telegram yetkazib bera olmasa ham webhook muvaffaqiyatli yakunlanadi.
  }
}

function appKeyboard(path = "", label = "📱 FBSU'ni ochish") {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: label, web_app: { url: `${APP_URL}${path}` } }]],
    },
  };
}

function tashkentNow(offsetDays = 0) {
  const base = new Date(Date.now() + TZ_OFFSET_MS + offsetDays * 86_400_000);
  const jsDay = base.getUTCDay();
  const day = String(base.getUTCDate()).padStart(2, "0");
  const month = String(base.getUTCMonth() + 1).padStart(2, "0");
  const year = base.getUTCFullYear();
  return {
    jsDay,
    dow: jsDay === 0 ? 7 : jsDay,
    title: DAY_TITLES[jsDay],
    dateLabel: `${day}.${month}.${year}`,
    iso: `${year}-${month}-${day}`,
  };
}

function tashkentStartOfDay(offsetDays = 0): Date {
  const now = tashkentNow(offsetDays);
  return new Date(Date.parse(`${now.iso}T00:00:00+05:00`));
}

function entryLine(entry: EntryRow, forTeacher: boolean): string {
  let line = `${entry.slot}-par ${entry.subject}`;
  if (forTeacher && entry.group?.name) line += ` — ${entry.group.name}`;
  if (entry.room) line += `, ${entry.room}`;
  const time = SLOT_TIMES[entry.slot];
  if (time) line += ` (${time})`;
  return line;
}

async function findLinkedUser(telegramId: string): Promise<LinkedUser | null> {
  return prisma.user.findUnique({ where: { telegramId }, include: { group: true } });
}

async function scheduleMessage(user: LinkedUser, offsetDays: number): Promise<string> {
  const now = tashkentNow(offsetDays);
  const label = offsetDays === 0 ? "Bugun" : offsetDays === 1 ? "Ertaga" : "Sana";
  const header = `📅 ${label} — ${now.title}, ${now.dateLabel}`;
  if (now.dow === 7) return `${header}\n\n🎉 Dam kuni — darslar yo'q.`;

  const forTeacher = user.role === "TEACHER";
  if (!forTeacher && !user.groupId) {
    return `${header}\n\nSizga guruh biriktirilmagan — jadval mavjud emas.`;
  }

  const entries = forTeacher
    ? await prisma.scheduleEntry.findMany({
        where: { teacherId: user.id, dayOfWeek: now.dow, status: { not: "CANCELLED" } },
        orderBy: { slot: "asc" },
        select: {
          dayOfWeek: true,
          slot: true,
          subject: true,
          room: true,
          teacher: true,
          lessonType: true,
          group: { select: { name: true } },
        },
      })
    : await prisma.scheduleEntry.findMany({
        where: { groupId: user.groupId ?? "", dayOfWeek: now.dow, status: { not: "CANCELLED" } },
        orderBy: { slot: "asc" },
        select: {
          dayOfWeek: true,
          slot: true,
          subject: true,
          room: true,
          teacher: true,
          lessonType: true,
        },
      });

  if (entries.length === 0) return `${header}\n\n📭 Darslar yo'q.`;
  const groupLine = !forTeacher && user.group ? `\n👥 Guruh: ${user.group.name}` : "";
  const lines = (entries as EntryRow[]).map((entry) => `• ${entryLine(entry, forTeacher)}`);
  return `${header}${groupLine}\n${SEPARATOR}\n${lines.join("\n")}`;
}

async function weekMessage(user: LinkedUser): Promise<string> {
  const forTeacher = user.role === "TEACHER";
  if (!forTeacher && !user.groupId) {
    return "Sizga guruh biriktirilmagan — jadval mavjud emas.";
  }
  const entries = (forTeacher
    ? await prisma.scheduleEntry.findMany({
        where: { teacherId: user.id, dayOfWeek: { gte: 1, lte: 6 }, status: { not: "CANCELLED" } },
        orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
        select: {
          dayOfWeek: true,
          slot: true,
          subject: true,
          room: true,
          teacher: true,
          lessonType: true,
          group: { select: { name: true } },
        },
      })
    : await prisma.scheduleEntry.findMany({
        where: {
          groupId: user.groupId ?? "",
          dayOfWeek: { gte: 1, lte: 6 },
          status: { not: "CANCELLED" },
        },
        orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
        select: {
          dayOfWeek: true,
          slot: true,
          subject: true,
          room: true,
          teacher: true,
          lessonType: true,
        },
      })) as EntryRow[];

  if (entries.length === 0) return "📭 Jadvalda darslar topilmadi.";
  const today = tashkentNow().dow;
  const byDay = new Map<number, EntryRow[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.dayOfWeek);
    if (list) list.push(entry);
    else byDay.set(entry.dayOfWeek, [entry]);
  }
  const lines: string[] = [];
  const groupLine = !forTeacher && user.group ? `👥 Guruh: ${user.group.name}` : "";
  lines.push(`🗓 Haftalik jadval${groupLine ? ` — ${groupLine.replace("👥 Guruh: ", "")}` : ""}`);
  for (const [day, dayEntries] of byDay) {
    const marker = day === today ? " (bugun)" : "";
    lines.push("");
    lines.push(`${DAY_TITLES[day]}${marker}`);
    for (const entry of dayEntries) lines.push(`• ${entryLine(entry, forTeacher)}`);
  }
  return lines.join("\n");
}

async function attendanceMessage(user: LinkedUser): Promise<string> {
  if (user.role !== "TEACHER") {
    return `ℹ️ Bu buyruq o'qituvchilar uchun.\n\n${await scheduleMessage(user, 0)}`;
  }
  const now = tashkentNow();
  const header = `🔔 Davomat — bugun, ${now.title}, ${now.dateLabel}`;
  if (now.dow === 7) return `${header}\n\n🎉 Dam kuni — darslar yo'q.`;
  const entries = (await prisma.scheduleEntry.findMany({
    where: { teacherId: user.id, dayOfWeek: now.dow, status: { not: "CANCELLED" } },
    orderBy: { slot: "asc" },
    select: {
      dayOfWeek: true,
      slot: true,
      subject: true,
      room: true,
      teacher: true,
      lessonType: true,
      group: { select: { name: true } },
    },
  })) as EntryRow[];
  if (entries.length === 0) return `${header}\n\n📭 Bugun darslaringiz yo'q.`;
  const lines = entries.map((entry) => `• ${entryLine(entry, true)}`);
  return `${header}\n${SEPARATOR}\n${lines.join("\n")}\n\n📲 Davomatni mini ilovada belgilang: ${APP_URL}/attendance`;
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
    },
  });
  if (sessions.length === 0) return "📭 Keyingi 30 kunda imtihonlar topilmadi.";
  const lines = sessions.map((session) => {
    const day = session.date.toLocaleDateString("uz-UZ", {
      timeZone: "Asia/Tashkent",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const time =
      session.startTime && session.endTime
        ? ` (${session.startTime}-${session.endTime})`
        : session.startTime
          ? ` (${session.startTime})`
          : "";
    const room = session.room ? `, ${session.room}` : "";
    return `• ${day} — ${session.course.title}: ${session.title}${room}${time}`;
  });
  return `📝 Kelayotgan imtihonlar (30 kun):\n${SEPARATOR}\n${lines.join("\n")}`;
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
        ? "Akkaunt bog'langan. /jadval — bugungi darslar, /ai — Fariza yordamchisi."
        : "🔐 Akkauntni bog'lash: saytda Sozlamalar → Aloqa → kod oling va shu yerga yuboring.",
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
    if (command === "jadval") return void (await sendBotMessage(chatId, await scheduleMessage(user, 0)));
    if (command === "ertaga") return void (await sendBotMessage(chatId, await scheduleMessage(user, 1)));
    if (command === "hafta") return void (await sendBotMessage(chatId, await weekMessage(user)));
    if (command === "davomat") return void (await sendBotMessage(chatId, await attendanceMessage(user)));
    return void (await sendBotMessage(chatId, await examsMessage(user)));
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
