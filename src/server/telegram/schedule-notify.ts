import "server-only";
import { prisma } from "@/lib/prisma";
import {
  DAY_TITLES,
  SEPARATOR,
  SLOT_TIMES,
  STATUS_LABELS,
  escapeHtml,
  normalizeTeacher,
} from "./rich";
import { reminderKeyboard, sendRichBotMessage, telegramConfigured } from "./send";

export type ScheduleNoticeAction = "created" | "updated" | "removed" | "approved";

export type ScheduleNotice = {
  groupId: string;
  groupName: string;
  teacherIds: string[];
  teacherNames: string[];
  lines: string[];
};

export type ChangeEntry = {
  dayOfWeek: number;
  slot: number;
  subject: string;
  room?: string | null;
  teacher?: string | null;
  teacherId?: string | null;
  lessonType?: string | null;
  parity?: string | null;
  subGroup?: string | null;
  status?: string;
  note?: string | null;
};

const ACTION_LABELS: Record<ScheduleNoticeAction, string> = {
  created: "➕ Jadvalga qo'shildi",
  updated: "🔄 O'zgartirildi",
  removed: "🗑 Jadvaldan olib tashlandi",
  approved: "✅ Jadval tasdiqlandi",
};

const PARITY_LABELS: Record<string, string> = {
  odd: "toq hafta",
  even: "juft hafta",
};

function statusText(status: string): string {
  return STATUS_LABELS[status] ?? "Oddiy";
}

function parityText(parity: string | null | undefined): string {
  if (!parity) return "har hafta";
  return PARITY_LABELS[parity] ?? parity;
}

export function scheduleLine(input: {
  action: ScheduleNoticeAction;
  dayOfWeek: number;
  slot: number;
  subject: string;
  room?: string | null;
  groupName?: string | null;
  status?: string | null;
  note?: string | null;
  detail?: string | null;
}): string {
  const time = SLOT_TIMES[input.slot] ?? "";
  const lines = [
    `🗓 <b>${DAY_TITLES[input.dayOfWeek] ?? ""}</b> · ${input.slot}-par${time ? ` · ${time}` : ""}`,
  ];
  const meta = [`📚 <b>${escapeHtml(input.subject)}</b>`];
  if (input.groupName) meta.push(`👥 ${escapeHtml(input.groupName)}`);
  if (input.room) meta.push(`🚪 ${escapeHtml(input.room)}`);
  lines.push(meta.join(" · "));
  const status = STATUS_LABELS[input.status ?? ""] ?? "";
  if (status) lines.push(`<i>${status}</i>`);
  if (input.detail) lines.push(escapeHtml(input.detail));
  lines.push(`<i>${ACTION_LABELS[input.action]}</i>`);
  if (input.note) lines.push(`📝 <i>${escapeHtml(input.note)}</i>`);
  return lines.join("\n");
}

export function scheduleChangeDetails(before: ChangeEntry, after: ChangeEntry): string[] {
  const details: string[] = [];
  if (before.dayOfWeek !== after.dayOfWeek) {
    details.push(`Kun: ${DAY_TITLES[before.dayOfWeek]} → ${DAY_TITLES[after.dayOfWeek]}`);
  }
  if (before.slot !== after.slot) details.push(`Par: ${before.slot} → ${after.slot}`);
  if (before.subject !== after.subject) {
    details.push(`Fan: ${before.subject} → ${after.subject}`);
  }
  if ((before.lessonType ?? "") !== (after.lessonType ?? "")) {
    details.push(`Dars turi: ${before.lessonType ?? "—"} → ${after.lessonType ?? "—"}`);
  }
  if ((before.room ?? "") !== (after.room ?? "")) {
    details.push(`Xona: ${before.room ?? "—"} → ${after.room ?? "—"}`);
  }
  if (normalizeTeacher(before.teacher ?? "") !== normalizeTeacher(after.teacher ?? "")) {
    details.push(`O'qituvchi: ${before.teacher ?? "—"} → ${after.teacher ?? "—"}`);
  }
  if (
    before.status !== undefined &&
    after.status !== undefined &&
    before.status !== after.status
  ) {
    details.push(`Holat: ${statusText(before.status)} → ${statusText(after.status)}`);
  }
  if ((before.parity ?? null) !== (after.parity ?? null)) {
    details.push(`Hafta: ${parityText(before.parity)} → ${parityText(after.parity)}`);
  }
  if ((before.subGroup ?? null) !== (after.subGroup ?? null)) {
    details.push(`Kichik guruh: ${before.subGroup ?? "—"} → ${after.subGroup ?? "—"}`);
  }
  if ((before.note ?? "") !== (after.note ?? "")) {
    details.push(`Izoh: ${before.note ?? "—"} → ${after.note ?? "—"}`);
  }
  return details;
}

export function capNoticeLines(lines: string[], max = 15): string[] {
  if (lines.length <= max) return lines;
  return [...lines.slice(0, max), `… va yana ${lines.length - max} ta o'zgarish`];
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

type Target = { telegramId: string; lines: string[] };

export async function sendScheduleNotices(
  notices: ScheduleNotice[],
  options: { title?: string } = {},
): Promise<void> {
  if (!telegramConfigured()) return;
  const active = notices.filter((notice) => notice.lines.length > 0);
  if (active.length === 0) return;

  const groupIds = [...new Set(active.map((notice) => notice.groupId).filter(Boolean))];
  const teacherIds = new Set(active.flatMap((notice) => notice.teacherIds).filter(Boolean));
  const teacherNames = new Set(
    active
      .flatMap((notice) => notice.teacherNames)
      .filter(Boolean)
      .map(normalizeTeacher),
  );

  try {
    const [students, teachers] = await Promise.all([
      groupIds.length > 0
        ? prisma.user.findMany({
            where: {
              role: "STUDENT",
              telegramId: { not: null },
              isActive: true,
              groupId: { in: groupIds },
            },
            select: { id: true, telegramId: true, groupId: true },
          })
        : Promise.resolve([]),
      teacherIds.size > 0 || teacherNames.size > 0
        ? prisma.user.findMany({
            where: { role: "TEACHER", telegramId: { not: null }, isActive: true },
            select: { id: true, name: true, telegramId: true },
          })
        : Promise.resolve([]),
    ]);

    const targets = new Map<string, Target>();
    for (const student of students) {
      if (!student.telegramId || !student.groupId) continue;
      const matched = active.filter((notice) => notice.groupId === student.groupId);
      if (matched.length === 0) continue;
      targets.set(student.id, {
        telegramId: student.telegramId,
        lines: matched.flatMap((notice) => notice.lines),
      });
    }
    for (const teacher of teachers) {
      if (!teacher.telegramId) continue;
      const matched = active.filter(
        (notice) =>
          notice.teacherIds.includes(teacher.id) ||
          notice.teacherNames.some(
            (name) => normalizeTeacher(name) === normalizeTeacher(teacher.name),
          ),
      );
      if (matched.length === 0) continue;
      const lines = matched.flatMap((notice) => notice.lines);
      const existing = targets.get(teacher.id);
      if (existing) existing.lines.push(...lines);
      else targets.set(teacher.id, { telegramId: teacher.telegramId, lines });
    }

    const title = options.title ?? "📢 <b>Jadval o'zgardi</b>";
    await mapLimit([...targets.values()], 5, async (target) => {
      const text = `${title}\n${SEPARATOR}\n\n${capNoticeLines(target.lines).join("\n\n")}`;
      try {
        await sendRichBotMessage(target.telegramId, text, reminderKeyboard());
      } catch (error) {
        console.error(
          "[telegram-schedule-notify]",
          target.telegramId,
          error instanceof Error ? error.message : error,
        );
      }
    });
  } catch (error) {
    console.error(
      "[telegram-schedule-notify]",
      error instanceof Error ? error.message : error,
    );
  }
}
