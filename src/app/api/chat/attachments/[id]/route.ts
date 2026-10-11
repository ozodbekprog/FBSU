import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/** Ovozli yoki fayl yuklab olish.
 * Faqat o'sha suhbat ishtirokchilari (participant) yuklab olishi mumkin.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id: attachmentId } = await params;
  const attachment = await prisma.messageAttachment.findUnique({
    where: { id: attachmentId },
    select: { messageId: true, kind: true, mimeType: true, size: true, durationSec: true, fileName: true, bytes: true },
  });
  if (!attachment) return Response.json({ ok: false, error: "Qo'shimcha topilmadi" }, { status: 404 });

  // Bloklash tekshiruvi
  const message = await prisma.message.findUnique({
    where: { id: attachment.messageId },
    select: { conversationId: true, senderId: true },
  });
  if (!message) return Response.json({ ok: false, error: "Xabar topilmadi" }, { status: 404 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: message.conversationId },
    select: { participantAId: true, participantBId: true },
  });
  if (!conversation) return Response.json({ ok: false, error: "Suhbat topilmadi" }, { status: 404 });
  if (conversation.participantAId !== user.id && conversation.participantBId !== user.id) {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });
  }

  // Ovoz, rasm va fayl turliga ruxsat (PostgreSQL bytea limit).
  if (attachment.kind !== "VOICE" && attachment.kind !== "FILE" && attachment.kind !== "IMAGE") {
    return Response.json({ ok: false, error: "Noto'g'ri tur" }, { status: 400 });
  }

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CHAT_DOWNLOAD_ATTACHMENT",
    entity: "MessageAttachment",
    entityId: attachmentId,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  const bytes = Buffer.from(attachment.bytes);

  // `?raw=1` — attachment'ni to'g'ridan-to'g'ri binary qilib beradi.
  // `<img>`, `<audio>` va `<a download>` shu rejimdan foydalanadi —
  // brauzer cookie bilan so'rov yuboradi, shuning uchun base64'ga
  // o'tkazish va holatda saqlash shart emas.
  const raw = new URL(request.url).searchParams.get("raw") === "1";
  const safeName = (attachment.fileName ?? "attachment").replace(/[^\w.\-]/g, "_");
  if (raw) {
    return new Response(bytes, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${safeName}"`,
      },
    });
  }

  // JSON rejim (eski moslik uchun).
  return Response.json({
    ok: true,
    data: {
      base64: bytes.toString("base64"),
      mimeType: attachment.mimeType,
      size: attachment.size,
      durationSec: attachment.durationSec,
      fileName: attachment.fileName,
    },
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
