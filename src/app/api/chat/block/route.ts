import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveChat } from "@/lib/chat-settings";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const blockSchema = z.object({
  conversationId: z.string().min(1),
  blocked: z.boolean(),
});

/**
 * Foydalanuvchini bloklash / blokdan chiqarish.
 *
 * Bloklangan foydalanuvchi xabar yubora olmaydi, qarshi tomon esa
 * "bloklangan" deb ko'radi (Telegram'dagi kabi — jim qoladi).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const parsed = blockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const chat = await resolveChat(user.id, parsed.data.conversationId);
  if (!chat.ok) return Response.json({ ok: false, error: chat.error }, { status: chat.status });

  if (parsed.data.blocked) {
    await prisma.chatBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId: user.id, blockedId: chat.partnerId },
      },
      create: { blockerId: user.id, blockedId: chat.partnerId },
      update: {},
    });
  } else {
    await prisma.chatBlock.deleteMany({
      where: { blockerId: user.id, blockedId: chat.partnerId },
    });
  }

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: parsed.data.blocked ? "CHAT_BLOCK" : "CHAT_UNBLOCK",
    entity: "User",
    entityId: chat.partnerId,
    meta: { conversationId: parsed.data.conversationId },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: { blocked: parsed.data.blocked } });
}