import { prisma } from "@/lib/prisma";

/** Ovozsizlik muddatlari (Telegram kabi). `null` — umr bo'yi. */
export const MUTE_PRESETS_MS = {
  "1h": 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "2d": 2 * 24 * 60 * 60 * 1000,
} as const;

export type MutePreset = keyof typeof MUTE_PRESETS_MS | "forever" | "off";

/**
 * Foydalanuvchining joriy vaqtda ovozsizligi.
 *
 * `mutedUntil` null bo'lsa — ovozli emas. O'tgan bo'lsa ham
 * `mutedUntil < now` bo'lsa — muddati tugagan.
 */
export function isMuted(mutedUntil: Date | null, now = Date.now()): boolean {
  if (!mutedUntil) return false;
  return mutedUntil.getTime() > now;
}

/**
 * Suhbat ishtirokchisini tekshiradi va ikkinchi tomon id'sini qaytaradi.
 * Bloklash mavjud bo'lsa — `blocked` qaytariladi (403 emas), shunda
 * mijoz "bloklangan" holatini ko'rsata oladi.
 */
export async function resolveChat(
  userId: string,
  conversationId: string,
): Promise<
  | {
      ok: true;
      partnerId: string;
      conversation: { id: string; participantAId: string; participantBId: string; clearedForEveryoneAt: Date | null };
      blocked: boolean;
      blockedByThem: boolean;
    }
  | { ok: false; status: number; error: string }
> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participantAId: true,
      participantBId: true,
      clearedForEveryoneAt: true,
    },
  });
  if (!conversation) return { ok: false, status: 404, error: "Suhbat topilmadi" };

  const isParticipant =
    conversation.participantAId === userId || conversation.participantBId === userId;
  if (!isParticipant) return { ok: false, status: 403, error: "Ruxsat yo'q" };

  const partnerId =
    conversation.participantAId === userId
      ? conversation.participantBId
      : conversation.participantAId;

  const [iBlockedThem, theyBlockedMe] = await Promise.all([
    prisma.chatBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: partnerId } },
      select: { id: true },
    }),
    prisma.chatBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: partnerId, blockedId: userId } },
      select: { id: true },
    }),
  ]);

  return {
    ok: true,
    partnerId,
    conversation,
    blocked: !!iBlockedThem,
    blockedByThem: !!theyBlockedMe,
  };
}

/** Foydalanuvchining suhbatga oid sozlamalarini o'qiydi (yaratadi). */
export async function getSetting(userId: string, conversationId: string) {
  const existing = await prisma.conversationSetting.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (existing) return existing;
  return prisma.conversationSetting.create({ data: { conversationId, userId } });
}