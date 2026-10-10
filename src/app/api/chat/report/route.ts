import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveChat } from "@/lib/chat-settings";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const REASONS = [
  "spam",
  "abuse",
  "fraud",
  "inappropriate",
  "other",
] as const;

const reportSchema = z.object({
  conversationId: z.string().min(1),
  reason: z.enum(REASONS),
  note: z.string().trim().max(1000).optional(),
});

/**
 * Foydalanuvchini shikoyat qilish (Telegram'dagi "Shikoyat qilish").
 *
 * Ayniq foydalanuvchi uchun emas — chunki bitta hisobda ko'p odam
 * bo'lishi mumkin; shikoyat har bir shaxs uchun alohida yoziladi.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Sabab noto'g'ri", allowed: REASONS },
      { status: 400 },
    );
  }

  const chat = await resolveChat(user.id, parsed.data.conversationId);
  if (!chat.ok) return Response.json({ ok: false, error: chat.error }, { status: chat.status });

  // Juda ko'p shikoyat yuborilishining oldini olish
  const recent = await prisma.userReport.count({
    where: { reporterId: user.id, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (recent >= 20) {
    return Response.json(
      { ok: false, error: "Kuniga 20 ta shikoyat yuborish mumkin" },
      { status: 429 },
    );
  }

  const report = await prisma.userReport.create({
    data: {
      reporterId: user.id,
      reportedId: chat.partnerId,
      reason: parsed.data.reason,
      note: parsed.data.note || null,
    },
    select: { id: true, createdAt: true },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CHAT_REPORT",
    entity: "UserReport",
    entityId: report.id,
    meta: { reportedId: chat.partnerId, reason: parsed.data.reason },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: { id: report.id } }, { status: 201 });
}

/** Sabablar ro'yxati — mijoz menyuni shundan to'ldiradi. */
export async function GET() {
  return Response.json({ ok: true, data: { reasons: REASONS } });
}