import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  /** Javob berilayotgan xabar (reply). */
  replyToId: z.string().min(1).optional(),
});

const lastSentAt = new Map<string, number>();
const SEND_INTERVAL_MS = 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, participantAId: true, participantBId: true },
  });
  if (!conversation) {
    return Response.json({ ok: false, error: "Suhbat topilmadi" }, { status: 404 });
  }
  if (conversation.participantAId !== user.id && conversation.participantBId !== user.id) {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });
  }

  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, isRead: false },
    data: { isRead: true },
  });

  const setting = await prisma.conversationSetting.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
    select: { clearedAt: true },
  });

  // "Tarixni tozalash": foydalanuvchining o'z tozalash vaqtidan keyingi
  // xabarlar ko'rinmaydi. "Ikkalasida o'chirish" esa qarshi tomonga ham
  // ta'sir qiladi.
  const clearedForEveryoneAt = await prisma.conversation.findUnique({
    where: { id },
    select: { clearedForEveryoneAt: true },
  }).then((c) => c?.clearedForEveryoneAt ?? null);

  const boundaries = [setting?.clearedAt, clearedForEveryoneAt].filter(
    (d): d is Date => !!d,
  );
  const visibleFrom = boundaries.length ? new Date(Math.max(...boundaries.map((d) => d.getTime()))) : null;

  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
      ...(visibleFrom ? { createdAt: { gt: visibleFrom } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    // `bytes` (bytea) ustuni yuklanmaydi — xabar ro'yxatida u kerak
    // emas, ovoz/fayl to'liq ma'lumoti alohida attachment endpointidan
    // olinadi (base64). Shu bilan ro'yxat yengil bo'ladi.
    include: {
      attachments: {
        select: {
          id: true,
          kind: true,
          mimeType: true,
          size: true,
          durationSec: true,
          fileName: true,
        },
      },
      replyTo: {
        select: { id: true, senderId: true, body: true },
      },
    },
  });
  messages.reverse();

  return Response.json({ ok: true, data: { messages } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, participantAId: true, participantBId: true },
  });
  if (!conversation) {
    return Response.json({ ok: false, error: "Suhbat topilmadi" }, { status: 404 });
  }
  if (conversation.participantAId !== user.id && conversation.participantBId !== user.id) {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Xabar 1-2000 belgi orasida bo'lishi kerak" },
      { status: 400 },
    );
  }

  const partnerId =
    conversation.participantAId === user.id
      ? conversation.participantBId
      : conversation.participantAId;

  // O'z tomonidan bloklagan foydalanuvchiga yuborish — Telegram kabi
  // "boshqa tomon bloklagan" deb xabar beriladi, lekin o'z xabarimiz
  // saqlanib qoladi (Telegram'da ham shunday).
  const blockedByThem = await prisma.chatBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: partnerId, blockedId: user.id } },
    select: { id: true },
  });
  if (blockedByThem) {
    return Response.json(
      { ok: false, error: "Siz tomondan bloklangan bo'lishingiz mumkin" },
      { status: 403 },
    );
  }

  const now = Date.now();
  const previous = lastSentAt.get(user.id) ?? 0;
  if (now - previous < SEND_INTERVAL_MS) {
    return Response.json(
      { ok: false, error: "Juda tez yuborilmoqda. Bir oz kuting" },
      { status: 429 },
    );
  }
  lastSentAt.set(user.id, now);

  // Reply: agar replyToId berilgan bo'lsa, u shu suhbatga tegishli
  // xabar ekanini tekshiramiz (begona xabarga javob berib bo'lmaydi).
  let replyToId: string | undefined = parsed.data.replyToId;
  if (replyToId) {
    const target = await prisma.message.findFirst({
      where: { id: replyToId, conversationId: id },
      select: { id: true },
    });
    if (!target) replyToId = undefined;
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: id, senderId: user.id, body: parsed.data.body, replyToId },
      include: { replyTo: { select: { id: true, senderId: true, body: true } } },
    }),
    prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  // Bloklash tekshiruvi yuqorida, yuborishdan OLDIN bajarildi.
  // Qo'shimcha: o'z tomonidan bloklagan foydalanuvchiga yuborish mumkin
  // (Telegram'da ham shunday) — faqat o'sha foydalanuvchiga yetib boradi.

  return Response.json({ ok: true, data: { message } }, { status: 201 });
}
