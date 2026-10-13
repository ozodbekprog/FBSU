import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeConversation, findLiveCall } from "@/lib/calls";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const startSchema = z.object({
  conversationId: z.string().min(1).max(64),
  /** Qo'ng'iroq turi: ovozli yoki video (default — video). */
  media: z.enum(["audio", "video"]).optional(),
});

/**
 * Video qo'ng'iroqni boshlash.
 *
 * Bir foydalanuvchida bir vaqtda faqat bitta tugallanmagan qo'ng'iroq
 * bo'lishi mumkin — aks holda callee bir nechta chaqiruvni ko'rib,
 * qaysarini tanashida qiyinchilik bo'lardi.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "conversationId yaroqsiz" }, { status: 400 });
  }

  const auth = await authorizeConversation(user.id, parsed.data.conversationId);
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // eskirgan chaqiruvlarni avval yopamiz, keyin o'zidan tekshiramiz
  await findLiveCall(user.id);
  const live = await findLiveCall(user.id);
  if (live) {
    return Response.json(
      { ok: false, error: "Siz allaqon qo'ng'iroqdasiz" },
      { status: 409 },
    );
  }

  const callee = await prisma.user.findUnique({
    where: { id: auth.partnerId },
    select: { id: true, name: true, avatarUrl: true, role: true, isActive: true },
  });
  if (!callee || !callee.isActive) {
    return Response.json({ ok: false, error: "Foydalanuvchi topilmadi" }, { status: 404 });
  }

  const call = await prisma.callSession.create({
    data: {
      conversationId: parsed.data.conversationId,
      callerId: user.id,
      calleeId: callee.id,
      status: "RINGING",
      media: parsed.data.media === "audio" ? "AUDIO" : "VIDEO",
    },
    include: {
      caller: { select: { id: true, name: true, avatarUrl: true, role: true } },
      callee: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CALL_START",
    entity: "CallSession",
    entityId: call.id,
    meta: { peerId: callee.id, conversationId: parsed.data.conversationId },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json(
    {
      ok: true,
      data: {
        id: call.id,
        status: call.status,
        conversationId: call.conversationId,
        peer: callee,
      },
    },
    { status: 201 },
  );
}