import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES: Role[] = ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const dayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  const [logs, todayLogs] = await Promise.all([
    prisma.accessLog.findMany({
      orderBy: { at: "desc" },
      take: 50,
      include: { user: { select: { name: true, role: true } } },
    }),
    prisma.accessLog.findMany({
      where: { at: { gte: dayStart }, allowed: true },
      select: { userId: true, direction: true },
    }),
  ]);

  const stats = {
    todayIn: todayLogs.filter((log) => log.direction === "IN").length,
    todayOut: todayLogs.filter((log) => log.direction === "OUT").length,
    uniqueToday: new Set(
      todayLogs
        .map((log) => log.userId)
        .filter((id): id is string => typeof id === "string"),
    ).size,
  };

  return Response.json({ ok: true, data: { logs, stats } });
}
