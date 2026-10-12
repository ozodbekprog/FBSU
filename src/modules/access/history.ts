import type { AccessDirection, Prisma, Role } from "@prisma/client";

export const ACCESS_HISTORY_PAGE_SIZE = 25;

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AccessRangeFilter = "today" | "week" | "month" | "all";
export type AccessDirectionFilter = AccessDirection | "";
export type AccessAllowedFilter = "" | "allowed" | "denied";

export type AccessHistoryFilters = {
  q: string;
  direction: AccessDirectionFilter;
  allowed: AccessAllowedFilter;
  range: AccessRangeFilter;
  page: number;
};

export type AccessHistoryStats = {
  todayIn: number;
  todayOut: number;
  uniqueToday: number;
};

export type AccessHistoryLog = {
  id: string;
  at: Date | string;
  direction: AccessDirection;
  gate: string;
  method: string;
  allowed: boolean;
  reason: string | null;
  user: { name: string; role: Role } | null;
};

export type AccessHistoryResult = {
  logs: AccessHistoryLog[];
  stats: AccessHistoryStats;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

const RANGE_FILTERS: readonly AccessRangeFilter[] = ["today", "week", "month", "all"];

export function defaultAccessHistoryFilters(): AccessHistoryFilters {
  return { q: "", direction: "", allowed: "", range: "all", page: 1 };
}

export function parseAccessHistoryFilters(params: URLSearchParams): AccessHistoryFilters {
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const directionParam = (params.get("direction") ?? "").toUpperCase();
  const allowedParam = params.get("allowed") ?? "";
  const rangeParam = params.get("range") ?? "";
  const pageParam = Number(params.get("page"));

  return {
    q,
    direction: directionParam === "IN" || directionParam === "OUT" ? directionParam : "",
    allowed: allowedParam === "allowed" || allowedParam === "denied" ? allowedParam : "",
    range: RANGE_FILTERS.includes(rangeParam as AccessRangeFilter)
      ? (rangeParam as AccessRangeFilter)
      : "all",
    page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
  };
}

/** Toshkent vaqti (UTC+5) bo'yicha bugungi kun boshlanishi. */
export function tashkentDayStart(now: Date = new Date()): Date {
  return new Date(
    Math.floor((now.getTime() + TASHKENT_OFFSET_MS) / DAY_MS) * DAY_MS - TASHKENT_OFFSET_MS,
  );
}

export function accessHistoryRangeStart(
  range: AccessRangeFilter,
  now: Date = new Date(),
): Date | null {
  const dayStart = tashkentDayStart(now);
  switch (range) {
    case "today":
      return dayStart;
    case "week":
      return new Date(dayStart.getTime() - 6 * DAY_MS);
    case "month":
      return new Date(dayStart.getTime() - 29 * DAY_MS);
    default:
      return null;
  }
}

export function accessHistoryWhere(
  filters: AccessHistoryFilters,
  now: Date = new Date(),
): Prisma.AccessLogWhereInput {
  const where: Prisma.AccessLogWhereInput = {};

  const start = accessHistoryRangeStart(filters.range, now);
  if (start) where.at = { gte: start };
  if (filters.direction) where.direction = filters.direction;
  if (filters.allowed === "allowed") where.allowed = true;
  if (filters.allowed === "denied") where.allowed = false;
  if (filters.q) where.user = { name: { contains: filters.q, mode: "insensitive" } };

  return where;
}
