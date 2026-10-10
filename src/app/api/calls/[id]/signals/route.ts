import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeCall } from "@/lib/calls";

const signalSchema = z.object({
  type: z.enum(["OFFER", "ANSWER", "ICE", "HANGUP"]),
  payload: z.unknown().optional(),
});

/**
 * WebRTC signallarini yuborish (offer / answer / ICE / hangup).
 *
 * Signal hajmi kichik bo'lishi kerak — ICE candidate'lar soni ko'p
 * bo'lsa limit oshadi. `payload` JSON sifatida saqlanadi va mijoz
 * `GET /api/calls/active?since=` orqali oladi.
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
  if (auth.call.status === "ENDED" || auth.call.status === "DECLINED") {
    return Response.json({ ok: false, error: "Qo'ng'iroq tugagan" }, { status: 409 });
  }

  const parsed = signalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Signal yaroqsiz" }, { status: 400 });
  }

  // JSON hajmini cheklaymiz — ruxsatsiz foydalanuvchi katta payload
  // yuborib bazani to'ldirishi (DoS) mumkin.
  let payload: unknown = null;
  if (parsed.data.payload !== undefined && parsed.data.payload !== null) {
    payload = parsed.data.payload;
    const size = JSON.stringify(payload).length;
    if (size > 64 * 1024) {
      return Response.json({ ok: false, error: "Signal hajmi katta" }, { status: 413 });
    }
  }

  const signal = await prisma.callSignal.create({
    data: {
      callId: id,
      fromId: user.id,
      type: parsed.data.type,
      payload: payload === null ? undefined : (payload as object),
    },
    select: { id: true, createdAt: true },
  });

  // HANGUP yuborilgan bo'lsa — qo'ng'iroq darhol tugaydi.
  if (parsed.data.type === "HANGUP") {
    await prisma.callSession.updateMany({
      where: { id, status: { in: ["RINGING", "ACTIVE"] } },
      data: { status: "ENDED", endedAt: new Date() },
    });
  }

  return Response.json(
    { ok: true, data: { id: signal.id, createdAt: signal.createdAt.toISOString() } },
    { status: 201 },
  );
}