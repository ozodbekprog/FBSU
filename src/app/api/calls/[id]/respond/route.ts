import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeCall } from "@/lib/calls";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

/**
 * Chaqiruvga javob: qabul qilish yoki rad etish.
 *
 * Faqat chaqirilgan tomon (`callee`) javob berishi mumkin — qo'ng'iroqni
 * o'zi bosgan tomon o'z qo'ng'iroqini qabul qila olmasligi kerak,
 * aks holda takroriy chaqiruv yaratish mumkin bo'lardi.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const auth = await authorizeCall(user.id, id);
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  if (auth.call.calleeId !== user.id) {
    return Response.json(
      { ok: false, error: "Faqat chaqirilgan tomon javob berishi mumkin" },
      { status: 403 },
    );
  }
  if (auth.call.status !== "RINGING") {
    return Response.json({ ok: false, error: "Qo'ng'iroq allaqach yopilgan" }, { status: 409 });
  }

  const parsed = respondSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "action yaroqsiz" }, { status: 400 });
  }

  const accepted = parsed.data.action === "accept";
  const call = await prisma.callSession.update({
    where: { id },
    data: {
      status: accepted ? "ACTIVE" : "DECLINED",
      startedAt: accepted ? new Date() : null,
      endedAt: accepted ? null : new Date(),
    },
    select: { id: true, status: true, startedAt: true },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "CALL_RESPOND",
    entity: "CallSession",
    entityId: id,
    meta: { action: parsed.data.action },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: call });
}