import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeCall } from "@/lib/calls";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/**
 * Qo'ng'iroqni tugatish (tomon tomonidan).
 *
 * Ikkalama holat ham `ENDED` ga o'tadi: chaqirilgan tomon javob bermay
 * qo'ydi desang, bu `MISSED` bo'lishi kerak — shuning uchun caller
 * chaqiruvni bekor qilganda `CANCELLED` o'rniga `ENDED` qo'yamiz, lekin
 * `MISSED` ni `findLiveCall()` da vaqt o'tishi bilan avtomatik yopamiz.
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

  // chaqirilgan tomon javob bermay tugatgan bo'lsa — bu "kechikdi"
  const missed = auth.call.status === "RINGING" && auth.call.callerId === user.id;

  const call = await prisma.callSession.updateMany({
    where: { id, status: { in: ["RINGING", "ACTIVE"] } },
    data: {
      status: missed ? "MISSED" : "ENDED",
      endedAt: new Date(),
    },
  });

  if (call.count > 0) {
    const clientInfo = getClientInfo(request);
    await createAuditLog({
      action: "CALL_END",
      entity: "CallSession",
      entityId: id,
      meta: { missed },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
  }

  return Response.json({ ok: true, data: { id, closed: call.count > 0 } });
}