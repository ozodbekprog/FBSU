import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findLiveCall } from "@/lib/calls";

/**
 * Polling uchun yagona nuqta — barcha real-time ehtiyojlar shu yerga
 * to'planadi:
 *
 *  1. Chaqirigelnayotgan qo'ng'iroq bormi? (chalar chaqiruvni ko'radi)
 *  2. Joriy qo'ng'iroqning yangi signallari bormi? (offer/answer/ICE)
 *
 * Vercel serverless WebSocket serverini qo'llab-quvvatlamaydi, shuning
 * uchun `since` parametri bilan mijoz o'ziga kerakli signalni
 * oladi. `since` yo'q bo'lsa faqat joriy holat qaytariladi (chaqiruv
 * qo'ng'iroq bosilishini aniqlash uchun).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const callIdRaw = url.searchParams.get("callId");

  // Vaqtni so'rov boshlanishida olamiz — javobda qaytaramiz.
  // Agar uni so'rov tugagandan keyin olsak, baza so'rovi va javob orasida
  // yaratilgan signal hech qachon yetkazilmay qolardi: keyingi so'rovda
  // `since` allaqachon o'sha signaldan keyingi vaqtga teng bo'lardi.
  const serverTime = new Date().toISOString();

  // eskirgan RINGING -> MISSED, va joriy qo'ng'iroqni topish
  const call = await findLiveCall(user.id);

  if (!call) {
    return Response.json({
      ok: true,
      data: {
        call: null,
        signals: [],
        serverTime,
      },
    });
  }

  const wantCall = callIdRaw === call.id;
  if (!since || !wantCall) {
    return Response.json({
      ok: true,
      data: {
        call: {
          id: call.id,
          status: call.status,
          conversationId: call.conversationId,
          isCaller: call.callerId === user.id,
          createdAt: call.createdAt.toISOString(),
          caller: call.caller,
          callee: call.callee,
        },
        signals: [],
        serverTime,
      },
    });
  }

  const signals = await prisma.callSignal.findMany({
    where: {
      callId: call.id,
      createdAt: { gt: since },
      // o'zimiz yuborgan signalni qaytarish shart emas
      fromId: { not: user.id },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, type: true, payload: true, createdAt: true },
  });

  return Response.json({
    ok: true,
    data: {
      call: {
        id: call.id,
        status: call.status,
        conversationId: call.conversationId,
        isCaller: call.callerId === user.id,
        createdAt: call.createdAt.toISOString(),
        caller: call.caller,
        callee: call.callee,
      },
      signals: signals.map((s) => ({
        id: s.id,
        type: s.type,
        payload: s.payload,
        createdAt: s.createdAt.toISOString(),
      })),
      serverTime,
    },
  });
}

/** Har 1 soniyada so'raladi — keshlanmasligi uchun. */
export const dynamic = "force-dynamic";