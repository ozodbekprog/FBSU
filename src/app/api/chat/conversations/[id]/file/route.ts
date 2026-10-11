import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/** Fayl yoki rasm yuklash (kompozutordan 📎 / 🖼️ tugmalari).
 * Ma'lumot base64 ko'rinishida keladi va `MessageAttachment.bytes`
 * (bytea) ustunida saqlanadi — serverless disk vaqtinchalik bo'lgani
 * uchun. Hajm limiti: 5 MB.
 *
 * @param request.body
 *   - base64: string (data URL bo'lsa ham moslashadi)
 *   - mimeType: string (masalan "image/png", "application/pdf")
 *   - fileName: string
 */
const schema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().min(1).max(255),
});

const MAX_SIZE_MB = 5;

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

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  // data:image/png;base64, prefiksi kelsa — kesib tashlaymiz
  const clean = parsed.data.base64.includes(",")
    ? parsed.data.base64.slice(parsed.data.base64.indexOf(",") + 1)
    : parsed.data.base64;
  const byteLength = Math.floor((clean.length * 3) / 4);
  const sizeMB = byteLength / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    return Response.json(
      { ok: false, error: `Fayl ${MAX_SIZE_MB} MB dan katta` },
      { status: 400 },
    );
  }

  const isImage = parsed.data.mimeType.startsWith("image/");

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        body: parsed.data.fileName,
        type: "FILE" as const,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  const attachment = await prisma.messageAttachment.create({
    data: {
      messageId: message.id,
      kind: isImage ? "IMAGE" : "FILE",
      mimeType: parsed.data.mimeType,
      bytes: Buffer.from(clean, "base64"),
      size: byteLength,
      fileName: parsed.data.fileName,
    },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CHAT_FILE_MESSAGE",
    entity: "MessageAttachment",
    entityId: attachment.id,
    meta: { mimeType: parsed.data.mimeType, sizeMB: sizeMB.toFixed(2), fileName: parsed.data.fileName },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json(
    { ok: true, data: { messageId: message.id, attachmentId: attachment.id, sizeMB: sizeMB.toFixed(2) } },
    { status: 201 },
  );
}
