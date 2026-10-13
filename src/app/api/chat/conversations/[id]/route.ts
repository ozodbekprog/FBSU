import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSetting, MUTE_PRESETS_MS, isMuted, type MutePreset } from "@/lib/chat-settings";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const patchSchema = z.object({
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  mute: z.enum(["1h", "8h", "2d", "forever", "off"]).nullable().optional(),
});

/**
 * Suhbat sozlamalari: mahkamlash, arxivga o'tkazish, ovozsizlik.
 *
 * Sozlamalar foydalanuvchi bo'yicha saqlanadi — bir tomon mahkamlagan
 * suhbat ikkinchi tomonda arxiv bo'lib qolishi mumkin.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, participantAId: true, participantBId: true },
  });
  if (!conversation) return Response.json({ ok: false, error: "Suhbat topilmadi" }, { status: 404 });
  if (conversation.participantAId !== user.id && conversation.participantBId !== user.id) {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });
  }

  const data: { pinnedAt?: Date | null; archivedAt?: Date | null; mutedUntil?: Date | null } = {};
  if (parsed.data.pinned !== undefined) {
    data.pinnedAt = parsed.data.pinned ? new Date() : null;
  }
  if (parsed.data.archived !== undefined) {
    data.archivedAt = parsed.data.archived ? new Date() : null;
  }
  if (parsed.data.mute !== undefined) {
    if (parsed.data.mute === null || parsed.data.mute === "off") {
      data.mutedUntil = null;
    } else if (parsed.data.mute === "forever") {
      // 100 yil — amalda "abadiy", lekin Date chegarasi buzilmaydi
      data.mutedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
    } else {
      const ms = MUTE_PRESETS_MS[parsed.data.mute as Exclude<MutePreset, "forever" | "off">];
      data.mutedUntil = new Date(Date.now() + ms);
    }
  }

  const setting = await prisma.conversationSetting.upsert({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
    create: { conversationId: id, userId: user.id, ...data },
    update: data,
  });

  return Response.json({
    ok: true,
    data: {
      pinned: !!setting.pinnedAt,
      archived: !!setting.archivedAt,
      muted: isMuted(setting.mutedUntil),
      mutedUntil: setting.mutedUntil?.toISOString() ?? null,
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const setting = await getSetting(user.id, id);
  const [theyBlockedMe, iBlockedThem] = await Promise.all([
    prisma.conversation
      .findUnique({ where: { id }, select: { participantAId: true, participantBId: true } })
      .then((c) =>
        c
          ? prisma.chatBlock.findUnique({
              where: {
                blockerId_blockedId: {
                  blockerId: c.participantAId === user.id ? c.participantBId : c.participantAId,
                  blockedId: user.id,
                },
              },
              select: { id: true },
            })
          : null,
      ),
    prisma.conversation
      .findUnique({ where: { id }, select: { participantAId: true, participantBId: true } })
      .then((c) =>
        c
          ? prisma.chatBlock.findUnique({
              where: {
                blockerId_blockedId: {
                  blockerId: user.id,
                  blockedId: c.participantAId === user.id ? c.participantBId : c.participantAId,
                },
              },
              select: { id: true },
            })
          : null,
      ),
  ]);

  return Response.json({
    ok: true,
    data: {
      pinned: !!setting.pinnedAt,
      archived: !!setting.archivedAt,
      muted: isMuted(setting.mutedUntil),
      mutedUntil: setting.mutedUntil?.toISOString() ?? null,
      blocked: !!iBlockedThem,
      blockedByThem: !!theyBlockedMe,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, participantAId: true, participantBId: true },
  });
  if (!conversation) return Response.json({ ok: false, error: "Suhbat topilmadi" }, { status: 404 });
  if (conversation.participantAId !== user.id && conversation.participantBId !== user.id) {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });
  }

  // Telegram uslubi: suhbatni o'chirish = FAQAT shu foydalanuvchi
  // ro'yxatidan yashirish.
  //
  //  - `deletedAt` — ro'yxatdan yashirish belgisi. Yashirin hisoblanadi
  //    faqat `deletedAt > lastMessageAt` bo'lganda, ya'ni o'chirilgandan
  //    keyin yangi xabar kelmagan bo'lsa. Qarshi tomon yozsa, suhbat
  //    o'z-o'zidan qaytadi.
  //  - `clearedAt` — tarixni ham tozalaymiz: qaytganda eski xabarlar
  //    ko'rinmasin (Telegram'dagi kabi), faqat yangilari chiqsin.
  //
  // Yozuvlar bazadan O'CHIRILMAYDI: qarshi tomon uchun hech narsa
  // o'zgarmaydi va audit izi saqlanib qoladi.
  const now = new Date();
  await prisma.conversationSetting.upsert({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
    create: { conversationId: id, userId: user.id, deletedAt: now, clearedAt: now },
    update: { deletedAt: now, clearedAt: now, pinnedAt: null, archivedAt: null },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CHAT_DELETE",
    entity: "Conversation",
    entityId: id,
    meta: { scope: "for_me" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true });
}