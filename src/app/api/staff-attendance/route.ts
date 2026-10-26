import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { tashkentWall } from "@/lib/tz";

const actionSchema = z.object({
  action: z.enum(["in", "out"]),
});

function todayDate() {
  const wall = tashkentWall(new Date());
  return new Date(Date.UTC(wall.year, wall.month - 1, wall.day));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const date = todayDate();
  const [today, history] = await Promise.all([
    prisma.staffAttendance.findUnique({
      where: { userId_date: { userId: user.id, date } },
    }),
    prisma.staffAttendance.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 14,
    }),
  ]);

  return Response.json({ ok: true, data: { today, history } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "STUDENT") {
    return Response.json({ ok: false, error: "Faqat xodimlar uchun" }, { status: 403 });
  }

  const staffRateLimit = await checkRateLimit(`staff:attendance:${user.id}`, {
    windowMs: 60_000,
    maxAttempts: 20,
    keyPrefix: "api",
  });
  if (!staffRateLimit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring" },
      { status: 429 },
    );
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const date = todayDate();
  const existing = await prisma.staffAttendance.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  const now = new Date();

  if (parsed.data.action === "in") {
    if (existing?.checkInAt) {
      return Response.json({ ok: false, error: "Allaqachon belgilangan" }, { status: 409 });
    }
    const record = await prisma.staffAttendance.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, checkInAt: now },
      update: { checkInAt: now },
    });
    return Response.json({ ok: true, data: record });
  }

  if (!existing?.checkInAt) {
    return Response.json({ ok: false, error: "Avval kiring" }, { status: 400 });
  }
  if (existing.checkOutAt) {
    return Response.json({ ok: false, error: "Allaqachon belgilangan" }, { status: 409 });
  }

  const record = await prisma.staffAttendance.update({
    where: { userId_date: { userId: user.id, date } },
    data: { checkOutAt: now },
  });
  return Response.json({ ok: true, data: record });
}
