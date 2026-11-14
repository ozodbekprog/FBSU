import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pathLabel, referrerSource } from "./format";
import { TRAFFIC_ONLINE_WINDOW_MS, type TrafficKind, type TrafficRange } from "./types";

const DAY_MS = 86_400_000;
const TASHKENT_OFFSET_MS = 5 * 3_600_000;

function shift(date: Date): Date {
  return new Date(date.getTime() + TASHKENT_OFFSET_MS);
}

function localKey(date: Date, mode: "hour" | "day"): string {
  const local = shift(date);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  if (mode === "day") return `${y}-${m}-${d}`;
  return `${y}-${m}-${d} ${String(local.getUTCHours()).padStart(2, "0")}`;
}

export function tashkentDayStart(daysBack = 0): Date {
  const local = shift(new Date());
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysBack) -
      TASHKENT_OFFSET_MS,
  );
}

export function resolveRangeStart(range: TrafficRange): Date {
  if (range === "today") return tashkentDayStart(0);
  if (range === "7d") return tashkentDayStart(6);
  return tashkentDayStart(29);
}

function sessionWhere(kind: TrafficKind): Prisma.TrafficSessionWhereInput {
  if (kind === "human") return { isBot: false };
  if (kind === "bot") return { isBot: true };
  return {};
}

function viewWhere(kind: TrafficKind): Prisma.TrafficPageViewWhereInput {
  if (kind === "human") return { isBot: false };
  if (kind === "bot") return { isBot: true };
  return {};
}

function rawKind(kind: TrafficKind): Prisma.Sql {
  if (kind === "human") return Prisma.sql`AND "isBot" = false`;
  if (kind === "bot") return Prisma.sql`AND "isBot" = true`;
  return Prisma.empty;
}

// Ustunlar `timestamp without time zone` va UTC devor vaqtini saqlaydi;
// Date parametri sessiya vaqt mintaqasiga o'girilib ketmasligi uchun UTC'ga qotiramiz.
function utcDateTime(date: Date): Prisma.Sql {
  return Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

function groupEvery<T extends { label: string; value: number }>(items: T[], size: number) {
  const out: Array<{ label: string; value: number }> = [];
  for (let index = 0; index < items.length; index += size) {
    const chunk = items.slice(index, index + size);
    out.push({
      label: chunk[0]?.label ?? "",
      value: chunk.reduce((sum, item) => sum + item.value, 0),
    });
  }
  return out;
}

function buildSeries(
  range: TrafficRange,
  start: Date,
  rows: Array<{ bucket: string; views: number }>,
) {
  const map = new Map(rows.map((row) => [row.bucket, Number(row.views)]));
  const now = new Date();
  const out: Array<{ label: string; value: number }> = [];

  if (range === "today") {
    let cursor = new Date(start);
    while (cursor <= now) {
      const key = localKey(cursor, "hour");
      out.push({ label: `${key.slice(11, 13)}:00`, value: map.get(key) ?? 0 });
      cursor = new Date(cursor.getTime() + 3_600_000);
    }
    return out;
  }

  let cursor = new Date(start);
  while (cursor <= now) {
    const key = localKey(cursor, "day");
    out.push({ label: `${key.slice(8, 10)}.${key.slice(5, 7)}`, value: map.get(key) ?? 0 });
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return range === "30d" ? groupEvery(out, 3) : out;
}

export type TrafficOverview = {
  views: number;
  visitors: number;
  sessions: number;
  botSessions: number;
  botViews: number;
  online: number;
  series: Array<{ label: string; value: number }>;
  topPaths: Array<{ path: string; label: string; views: number; visitors: number }>;
  countries: Array<{ name: string; value: number }>;
  cities: Array<{ name: string; value: number }>;
  browsers: Array<{ name: string; value: number }>;
  sources: Array<{ name: string; value: number }>;
};

export async function getTrafficOverview(
  range: TrafficRange,
  kind: TrafficKind,
): Promise<TrafficOverview> {
  const start = resolveRangeStart(range);
  const onlineSince = new Date(Date.now() - TRAFFIC_ONLINE_WINDOW_MS);
  const bucketExpr =
    range === "today"
      ? Prisma.sql`to_char(date_trunc('hour', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tashkent'), 'YYYY-MM-DD HH24')`
      : Prisma.sql`to_char(date_trunc('day', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tashkent'), 'YYYY-MM-DD')`;

  const [
    views,
    sessions,
    visitorRows,
    botSessions,
    botViews,
    online,
    seriesRows,
    pathRows,
    countryRows,
    cityRows,
    browserRows,
    sourceRows,
  ] = await Promise.all([
    prisma.trafficPageView.count({ where: { createdAt: { gte: start }, ...viewWhere(kind) } }),
    prisma.trafficSession.count({ where: { startedAt: { gte: start }, ...sessionWhere(kind) } }),
    prisma.$queryRaw<Array<{ visitors: number }>>(Prisma.sql`
      SELECT count(DISTINCT "visitorId")::int AS "visitors"
      FROM "TrafficSession"
      WHERE "startedAt" >= ${utcDateTime(start)} ${rawKind(kind)}
    `),
    prisma.trafficSession.count({ where: { startedAt: { gte: start }, isBot: true } }),
    prisma.trafficPageView.count({ where: { createdAt: { gte: start }, isBot: true } }),
    prisma.trafficSession.count({ where: { isBot: false, lastSeenAt: { gte: onlineSince } } }),
    prisma.$queryRaw<Array<{ bucket: string; views: number }>>(Prisma.sql`
      SELECT ${bucketExpr} AS "bucket", count(*)::int AS "views"
      FROM "TrafficPageView"
      WHERE "createdAt" >= ${utcDateTime(start)} ${rawKind(kind)}
      GROUP BY "bucket"
      ORDER BY "bucket"
    `),
    prisma.$queryRaw<Array<{ path: string; views: number; visitors: number }>>(Prisma.sql`
      SELECT "path" AS "path", count(*)::int AS "views", count(DISTINCT "visitorId")::int AS "visitors"
      FROM "TrafficPageView"
      WHERE "createdAt" >= ${utcDateTime(start)} ${rawKind(kind)}
      GROUP BY "path"
      ORDER BY "views" DESC
      LIMIT 12
    `),
    prisma.$queryRaw<Array<{ name: string; value: number }>>(Prisma.sql`
      SELECT "country" AS "name", count(DISTINCT "visitorId")::int AS "value"
      FROM "TrafficSession"
      WHERE "startedAt" >= ${utcDateTime(start)} AND "country" IS NOT NULL AND "country" <> '' ${rawKind(kind)}
      GROUP BY "country"
      ORDER BY "value" DESC
      LIMIT 8
    `),
    prisma.$queryRaw<Array<{ name: string; value: number }>>(Prisma.sql`
      SELECT "city" AS "name", count(DISTINCT "visitorId")::int AS "value"
      FROM "TrafficSession"
      WHERE "startedAt" >= ${utcDateTime(start)} AND "city" IS NOT NULL AND "city" <> '' ${rawKind(kind)}
      GROUP BY "city"
      ORDER BY "value" DESC
      LIMIT 8
    `),
    prisma.$queryRaw<Array<{ name: string | null; value: number }>>(Prisma.sql`
      SELECT "browser" AS "name", count(*)::int AS "value"
      FROM "TrafficSession"
      WHERE "startedAt" >= ${utcDateTime(start)} ${rawKind(kind)}
      GROUP BY "browser"
      ORDER BY "value" DESC
      LIMIT 6
    `),
    prisma.$queryRaw<Array<{ referrer: string | null; value: number }>>(Prisma.sql`
      SELECT "referrer" AS "referrer", count(*)::int AS "value"
      FROM "TrafficSession"
      WHERE "startedAt" >= ${utcDateTime(start)} ${rawKind(kind)}
      GROUP BY "referrer"
      ORDER BY "value" DESC
      LIMIT 300
    `),
  ]);

  const sources = new Map<string, number>();
  for (const row of sourceRows) {
    const name = referrerSource(row.referrer);
    sources.set(name, (sources.get(name) ?? 0) + Number(row.value));
  }

  return {
    views,
    visitors: Number(visitorRows[0]?.visitors ?? 0),
    sessions,
    botSessions,
    botViews,
    online,
    series: buildSeries(range, start, seriesRows),
    topPaths: pathRows.map((row) => ({
      path: row.path,
      label: pathLabel(row.path),
      views: Number(row.views),
      visitors: Number(row.visitors),
    })),
    countries: countryRows.map((row) => ({ name: row.name, value: Number(row.value) })),
    cities: cityRows.map((row) => ({ name: row.name, value: Number(row.value) })),
    browsers: browserRows.map((row) => ({ name: row.name ?? "Noma'lum", value: Number(row.value) })),
    sources: Array.from(sources.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
  };
}

export async function getLiveSessions(limit = 40) {
  return prisma.trafficSession.findMany({
    where: {
      isBot: false,
      lastSeenAt: { gte: new Date(Date.now() - TRAFFIC_ONLINE_WINDOW_MS) },
    },
    orderBy: { lastSeenAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, role: true, group: { select: { name: true } } } },
      login: { select: { method: true } },
      device: { select: { name: true } },
    },
  });
}

const DEFAULT_PAGE_SIZE = 25;

export async function getTrafficSessions(options: {
  range: TrafficRange;
  kind: TrafficKind;
  search: string;
  page: number;
  pageSize?: number;
}) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const start = resolveRangeStart(options.range);
  const where: Prisma.TrafficSessionWhereInput = {
    startedAt: { gte: start },
    ...sessionWhere(options.kind),
  };
  if (options.search) {
    where.OR = [
      { ip: { contains: options.search } },
      { landingPath: { contains: options.search, mode: "insensitive" } },
      { lastPath: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.trafficSession.count({ where }),
    prisma.trafficSession.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      skip: (options.page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, role: true, group: { select: { name: true } } } },
        login: { select: { method: true } },
        device: { select: { name: true } },
      },
    }),
  ]);

  return { total, items, pageSize };
}

export async function getTrafficUsers(range: TrafficRange) {
  const start = resolveRangeStart(range);
  const rows = await prisma.$queryRaw<
    Array<{ id: string; views: number; visitors: number; last: Date }>
  >(Prisma.sql`
    SELECT "userId" AS "id", count(*)::int AS "views",
           count(DISTINCT "visitorId")::int AS "visitors", max("createdAt") AS "last"
    FROM "TrafficPageView"
    WHERE "createdAt" >= ${utcDateTime(start)} AND "userId" IS NOT NULL AND "isBot" = false
    GROUP BY "userId"
    ORDER BY "views" DESC
    LIMIT 50
  `);
  if (rows.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    select: { id: true, name: true, role: true, group: { select: { name: true } } },
  });
  const userMap = new Map(users.map((user) => [user.id, user]));
  return rows
    .map((row) => {
      const user = userMap.get(row.id);
      if (!user) return null;
      return {
        id: row.id,
        name: user.name,
        role: user.role,
        group: user.group?.name ?? null,
        views: Number(row.views),
        visitors: Number(row.visitors),
        last: row.last,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function getTrafficBots(range: TrafficRange) {
  const start = resolveRangeStart(range);
  return prisma.$queryRaw<
    Array<{ name: string; hits: number; pages: number; last: Date }>
  >(Prisma.sql`
    SELECT COALESCE("botName", 'Noma''lum') AS "name", count(*)::int AS "hits",
           count(DISTINCT "path")::int AS "pages", max("createdAt") AS "last"
    FROM "TrafficPageView"
    WHERE "createdAt" >= ${utcDateTime(start)} AND "isBot" = true
    GROUP BY "botName"
    ORDER BY "hits" DESC
    LIMIT 15
  `);
}

export async function getTrafficSessionDetail(id: string) {
  const session = await prisma.trafficSession.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          group: { select: { name: true } },
        },
      },
      login: true,
      device: true,
      views: { orderBy: { createdAt: "asc" }, take: 300 },
    },
  });
  if (!session) return null;

  const actions = session.userId
    ? await prisma.auditLog.findMany({
        where: {
          actorId: session.userId,
          createdAt: {
            gte: session.startedAt,
            lte: new Date(Math.min(session.lastSeenAt.getTime() + 60_000, Date.now())),
          },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: { id: true, action: true, entity: true, createdAt: true },
      })
    : [];

  const totalDuration = session.views.reduce((sum, view) => sum + (view.durationMs ?? 0), 0);

  return { session, actions, totalDuration };
}
