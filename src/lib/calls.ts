import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Video qo'ng'iroq yordamchilari.
 *
 * Media oqimi WebRTC orqali P2P — server orqali o'tmaydi. Server faqat
 * signalni (offer/answer/ICE) saqlaydi va almashinadi. Vercel serverless
 * WebSocket serverini qo'llab-quvvatlamagani uchun `GET /api/calls/active`
 * orqali polling qilinadi.
 */

/** Chaqirigacha kutish vaqtı. Shundan keyin `MISSED` ga aylanadi. */
export const RING_TIMEOUT_MS = 45_000;

/** Signal almashinuvidagi maksimal kechikish — undan keyin qo'ng'iroq tugaydi. */
export const CALL_MAX_DURATION_MS = 2 * 60 * 60 * 1000;

export const ACTIVE_CALL_STATUSES = ["RINGING", "ACTIVE"] as const;

export type ChatUser = Pick<User, "id" | "name" | "avatarUrl" | "role">;

export function partnerOf(conversation: { participantAId: string; participantBId: string }, userId: string) {
  return conversation.participantAId === userId
    ? conversation.participantBId
    : conversation.participantAId;
}

/**
 * Chaqirilgan tomon suhbatning ikkala ishtirokchisidan biri bo'lishi
 * SHARTI bilan tekshiriladi. Aks holda begona suhbatga qo'ng'iroq qilish
 * mumkin bo'lardi.
 */
export async function authorizeConversation(
  userId: string,
  conversationId: string,
): Promise<{ ok: true; partnerId: string } | { ok: false; status: number; error: string }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, participantAId: true, participantBId: true },
  });
  if (!conversation) return { ok: false, status: 404, error: "Suhbat topilmadi" };
  if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
    return { ok: false, status: 403, error: "Ruxsat yo'q" };
  }
  return { ok: true, partnerId: partnerOf(conversation, userId) };
}

/**
 * Foydalanuvchining tugallanmagan qo'ng'iroqi (chaqiruv yoki chaqirilish).
 *
 * `RINGING` vaqt o'tib ketganlar avtomatik `MISSED` ga aylanadi — aks
 * holda eskirgan chaqiruv foydalanuvchining boshqa qo'ng'iroqini bloklab
 * qo'yardi.
 */
export async function findLiveCall(userId: string) {
  const now = Date.now();
  // Jami muddatdan o'tgan `ACTIVE` qo'ng'iroqlarni yopamiz. Aks holda
  // brauzer yopilgach `ACTIVE` holati butunlay qolardi va foydalanuvchi
  // yangi qo'ng'iroq bosolmay qo'yardi (tugma `disabled` bo'lib qolardi).
  await prisma.callSession.updateMany({
    where: {
      status: "ACTIVE",
      OR: [
        { startedAt: { lt: new Date(now - CALL_MAX_DURATION_MS) } },
        { startedAt: null, createdAt: { lt: new Date(now - CALL_MAX_DURATION_MS) } },
      ],
    },
    data: { status: "ENDED", endedAt: new Date(now) },
  });

  await prisma.callSession.updateMany({
    where: {
      status: "RINGING",
      createdAt: { lt: new Date(now - RING_TIMEOUT_MS) },
    },
    data: { status: "MISSED", endedAt: new Date(now) },
  });

  return prisma.callSession.findFirst({
    where: {
      OR: [{ callerId: userId }, { calleeId: userId }],
      status: { in: [...ACTIVE_CALL_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      conversation: { select: { id: true } },
      caller: { select: { id: true, name: true, avatarUrl: true, role: true } },
      callee: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
}

/**
 * Ushbu qo'ng'iroqning ishtirokchisi ekanini tekshiradi. Boshqa bir
 * qo'ng'iroqning signalini o'qish yoki yuborish shu bilan rad etiladi.
 */
export async function authorizeCall(
  userId: string,
  callId: string,
): Promise<{ ok: true; call: NonNullable<Awaited<ReturnType<typeof findLiveCall>>> } | { ok: false; status: number; error: string }> {
  const call = await prisma.callSession.findUnique({
    where: { id: callId },
    include: {
      conversation: { select: { id: true } },
      caller: { select: { id: true, name: true, avatarUrl: true, role: true } },
      callee: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
  if (!call) return { ok: false, status: 404, error: "Qo'ng'iroq topilmadi" };
  if (call.callerId !== userId && call.calleeId !== userId) {
    return { ok: false, status: 403, error: "Ruxsat yo'q" };
  }
  return { ok: true, call };
}

export function peerOf(
  call: {
    callerId: string;
    calleeId: string;
    caller: ChatUser;
    callee: ChatUser;
  },
  userId: string,
) {
  return call.callerId === userId ? call.callee : call.caller;
}