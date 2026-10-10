import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveChat } from "@/lib/chat-settings";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/**
 * "Ikkalasida o'chirish" — suhbatning barcha xabarlari ikkala tomon uchun
 * ham ko'rinmay qiladi.
 *
 * Yozuvlar bazadan o'chirilmaydi: `Conversation.clearedForEveryoneAt`
 * belgilanadi va xabarlar shu vaqtdan keyingilar deb qaraladi. Sabab —
 * universitet miqyosida xabar mazmuni shikoyat teksiruvida manba bo'lishi
 * mumkin; jismiy o'chirish uni yo'qotirdi.
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
    prisma.conversation.update({
      where: { id },
      data: { clearedForEveryoneAt: clearedAt },
    }),
    // har bir tomonning o'z tarixi ham tozalanadi
    prisma.conversationSetting.updateMany({
      where: { conversationId: id },
      data: { clearedAt },
    }),
  ]);

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CHAT_CLEAR_HISTORY",
    entity: "Conversation",
    entityId: id,
    meta: { scope: "everyone" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: { clearedAt: clearedAt.toISOString() } });
}