import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/** Ovozli xabar yuklash (MediaRecorder).
 * Faqat client-side (brauzer) bosqich. Audio .webm/opus formatida yoziladi.
 * 5 MB (≈28 daqiqa) limiti bilan. Faostat Redis/KVga o'tkazilmasa va PostgreSQL
 * bytea hajmi cheklanadi.
 * @param request.body
 *   - audioBase64: string (base64-encoded audio)
 *   - mimeType: string (masalan, "audio/opus")
 *   - durationSec: number
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id: conversationId } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participantAId: true, participantBId: true },
  });
  if (!conversation) return Response.json({ ok: false, error: "Suhbat topilmadi" }, { status: 404 });
  if (conversation.participantAId !== user.id && conversation.participantBId !== user.id) {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.audioBase64 || !body?.mimeType || body.durationSec == null) {
    return Response.json(
      { ok: false, error: "audioBase64, mimeType va durationShomari shart" },
      { status: 400 },
    );
  }

  // Hajm tekshiruvi (5 MB limit)
  const base64Str = body.audioBase64;
  const byteLength = (base64Str.length * 3) / 4 - base64Str.length / 16;
  const sizeMB = byteLength / (1024 * 1024);
  if (sizeMB > 5) {
    return Response.json(
      { ok: false, error: "5 MB gacha (≈28 daqiqa) ovoz belgilanadi" },
      { status: 400 },
    );
  }

  // Avval xabar yarating
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: user.id,
      body: "",
      type: "VOICE" as const,
    },
  });

  const attachment = await prisma.messageAttachment.create({
    data: {
      messageId: message.id,
      kind: "VOICE",
      mimeType: body.mimeType,
      bytes: Buffer.from(base64Str, "base64"),
      size: byteLength,
      durationSec: body.durationSec,
      fileName: `voice-${Date.now()}.webm`,
    },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CHAT_VOICE_MESSAGE",
    entity: "MessageAttachment",
    entityId: attachment.id,
    meta: { durationSec: body.durationSec, mimeType: body.mimeType },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({
    ok: true,
    data: {
      attachmentId: attachment.id,
      messageId: message.id,
      durationSec: body.durationSec,
      sizeMB: sizeMB.toFixed(2),
    },
    messageId: message.id,
  });
}

export const config = {
  api: {
    bodyParser: false,
    response: {
      bodyParser: false,
    },
  },
};
