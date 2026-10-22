import { prisma } from "@/lib/prisma";
import { textMatches } from "@/lib/encrypted-search";
import {
  ACCESS_HISTORY_PAGE_SIZE,
  accessHistoryWhere,
  tashkentDayStart,
  type AccessHistoryFilters,
  type AccessHistoryResult,
} from "@/modules/access/history";

export async function getAccessHistory(
  filters: AccessHistoryFilters,
  now: Date = new Date(),
): Promise<AccessHistoryResult> {
  const where = accessHistoryWhere(filters, now);

  if (filters.q) {
    const users = await prisma.user.findMany({ select: { id: true, name: true } });
    const ids = users
      .filter((row) => textMatches(filters.q, [row.name]))
      .map((row) => row.id);
    delete where.user;
    where.userId = { in: ids };
  }

  const [total, logs, todayLogs] = await Promise.all([
    prisma.accessLog.count({ where }),
    prisma.accessLog.findMany({
      where,
      orderBy: { at: "desc" },
      skip: (filters.page - 1) * ACCESS_HISTORY_PAGE_SIZE,
      take: ACCESS_HISTORY_PAGE_SIZE,
      include: { user: { select: { name: true, role: true } } },
    }),
    prisma.accessLog.findMany({
      where: { at: { gte: tashkentDayStart(now) }, allowed: true },
      select: { userId: true, direction: true },
    }),
  ]);

  const stats = {
    todayIn: todayLogs.filter((log) => log.direction === "IN").length,
    todayOut: todayLogs.filter((log) => log.direction === "OUT").length,
    uniqueToday: new Set(
      todayLogs.map((log) => log.userId).filter((id): id is string => typeof id === "string"),
    ).size,
  };

  return {
    logs,
    stats,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / ACCESS_HISTORY_PAGE_SIZE)),
    pageSize: ACCESS_HISTORY_PAGE_SIZE,
  };
}
