import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const editSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

/**
 * Xabarni tahrirlash (PATCH) va o'chirish (DELETE).
 *
 * Faqat xabar EGASI o'z xabarini tahrirlashi yoki o'chirishi mumkin.
 * O'chirish — "yumshoq" (soft): yozuv bazada qoladi (audit izi), lekin
 * `deletedAt` belgilanadi va suhbatda "Xabar o'chirildi" ko'rinishida
 * chiqadi.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id, messageId } = await params;
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Xabar 1-2000 belgi orasida bo'lishi kerak" }, { status: 400 });
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId: id },
    select: { senderId: true, deletedAt: true },
  });
  if (!message) return Response.json({ ok: false, error: "Xabar topilmadi" }, { status: 404 });
  if (message.senderId !== user.id) {
    return Response.json({ ok: false, error: "Faqat o'z xabaringizni tahrirlaysiz" }, { status: 403 });
  }
  if (message.deletedAt) {
    return Response.json({ ok: false, error: "O'chirilgan xabarni tahrirlab bo'lmaydi" }, { status: 400 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { body: parsed.data.body, editedAt: new Date() },
    include: {
      attachments: { select: { id: true, kind: true, mimeType: true, size: true, durationSec: true, fileName: true } },
      replyTo: { select: { id: true, senderId: true, body: true } },
    },
  });

  return Response.json({ ok: true, data: { message: updated } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id, messageId } = await params;
  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId: id },
    select: { senderId: true, deletedAt: true },
  });
  if (!message) return Response.json({ ok: false, error: "Xabar topilmadi" }, { status: 404 });
  if (message.senderId !== user.id) {
    return Response.json({ ok: false, error: "Faqat o'z xabaringizni o'chirasiz" }, { status: 403 });
  }

  // Yumshoq o'chirish — yozuv bazada qoladi.
  await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  return Response.json({ ok: true });
}
