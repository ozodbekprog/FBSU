import { prisma } from "@/lib/prisma";
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
