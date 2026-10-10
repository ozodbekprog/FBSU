import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveChat } from "@/lib/chat-settings";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/**
 * "Tarixni tozalash" (Telegram'dagi "Clear history").
 *
 * O'chirilmaydi — faqat belgilangan vaqtdan keyingi xabarlar ko'rinmaydi.
 * Sabab: xabar yozuvlari universitet miqyosida xizmat va shikoyat
 * tekshiruvida kerak bo'lishi mumkin; o'chirib yuborish izni yo'qotirdi.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chat = await resolveChat(user.id, id);
  if (!chat.ok) return Response.json({ ok: false, error: chat.error }, { status: chat.status });

  const clearedAt = new Date();

  await prisma.$transaction([
    prisma.conversationSetting.upsert({
      where: { conversationId_userId: { conversationId: id, userId: user.id } },
      create: { conversationId: id, userId: user.id, clearedAt },
      update: { clearedAt },
    }),
    prisma.conversation.update({ where: { id }, data: { lastMessageAt: clearedAt } }),
  ]);

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CHAT_CLEAR_HISTORY",
    entity: "Conversation",
    entityId: id,
    meta: { scope: "self" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: { clearedAt: clearedAt.toISOString() } });
}