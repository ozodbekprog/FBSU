import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Baza yozilishini kamaytirish uchun minimal interval. */
const TOUCH_INTERVAL_MS = 60_000;

/**
 * "Onlayn bo'lg" vaqti.
 *
 * `lastSeenAt` har sahifa ochilishida emas, faqat 1 daqiqadan keyin
 * yangilanadi — aks holda har bir `getCurrentUser()` chaqiruvi baza
 * yozuviga aylangan bo'lardi.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const recent = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastSeenAt: true },
  });
  const last = recent?.lastSeenAt?.getTime() ?? 0;
  if (now - last > TOUCH_INTERVAL_MS) {
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date(now) } });
    return Response.json({ ok: true, data: { lastSeenAt: new Date(now).toISOString() } });
  }
  return Response.json({
    ok: true,
    data: { lastSeenAt: recent?.lastSeenAt?.toISOString() ?? null },
  });
}