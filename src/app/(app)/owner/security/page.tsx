import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/i18n";
import { Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Stat } from "@/components/ui";
import AdminSecurityTable from "@/components/security/AdminSecurityTable";
import { securityMessages } from "@/components/security/messages";
import type { AdminDeviceItem, AdminLoginItem, SecurityChangeItem } from "@/components/security/types";

const PAGE_SIZE = 100;

function locationLabel(city: string | null, country: string | null, fallback: string | null) {
  return fallback ?? ([city, country].filter(Boolean).join(", ") || "—");
}

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; deleted?: string; page?: string }>;
}) {
  await requireRole(["OWNER"]);
  const locale = await getLocale();
  const messages = securityMessages(locale);
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const showDeleted = params.deleted === "1";
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const where: Prisma.LoginRecordWhereInput = {
    ...(showDeleted ? {} : { deletedAt: null }),
    ...(query
      ? {
          user: {
            is: {
              OR: [
                { email: { contains: query, mode: "insensitive" as const } },
                { name: { contains: query, mode: "insensitive" as const } },
              ],
            },
          },
        }
      : {}),
  };

  const [total, records, userCount, deviceCount, activeDevices, logins24h, blocked24h] = await Promise.all([
    prisma.loginRecord.count({ where }),
    prisma.loginRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        device: { select: { id: true, revokedAt: true } },
      },
    }),
    prisma.user.count(),
    prisma.trustedDevice.count({ where: { revokedAt: null } }),
    prisma.trustedDevice.findMany({
      where: {
        revokedAt: null,
        ...(query
          ? {
              user: {
                is: {
                  OR: [
                    { email: { contains: query, mode: "insensitive" as const } },
                    { name: { contains: query, mode: "insensitive" as const } },
                  ],
                },
              },
            }
          : {}),
      },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.loginRecord.count({ where: { status: "SUCCESS", createdAt: { gte: since } } }),
    prisma.loginRecord.count({ where: { status: "BLOCKED", createdAt: { gte: since } } }),
  ]);

  const sessionIds = records.filter((record) => record.status === "SUCCESS").map((record) => record.id);
  const auditLogs = sessionIds.length
    ? await prisma.auditLog.findMany({
        where: { sessionId: { in: sessionIds }, action: { not: "LOGIN_SUCCESS" } },
        orderBy: { createdAt: "asc" },
        take: 2000,
        select: { id: true, action: true, entity: true, createdAt: true, sessionId: true },
      })
    : [];
  const changeMap = new Map<string, SecurityChangeItem[]>();
  for (const log of auditLogs) {
    if (!log.sessionId) continue;
    const list = changeMap.get(log.sessionId) ?? [];
    list.push({
      id: log.id,
      action: log.action,
      entity: log.entity,
      createdAt: log.createdAt.toISOString(),
    });
    changeMap.set(log.sessionId, list);
  }

  const loginItems: AdminLoginItem[] = records.map((record) => ({
    id: record.id,
    user: record.user,
    deviceName: record.deviceName,
    ip: record.ip,
    location: locationLabel(record.city, record.country, record.location),
    method: record.method,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    note: record.note,
    deletedAt: record.deletedAt ? record.deletedAt.toISOString() : null,
    deviceRevoked: record.device?.revokedAt !== null && record.device?.revokedAt !== undefined,
    changes: changeMap.get(record.id)?.length ?? 0,
    changeList: changeMap.get(record.id) ?? [],
  }));

  const deviceItems: AdminDeviceItem[] = activeDevices.map((device) => ({
    id: device.id,
    user: device.user,
    name: device.name,
    platform: device.platform,
    browser: device.browser,
    lastSeenAt: device.lastSeenAt.toISOString(),
    ip: device.lastIp ?? device.ip,
    location: locationLabel(device.city, device.country, null),
  }));

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const preserved = new URLSearchParams();
  if (query) preserved.set("q", query);
  if (showDeleted) preserved.set("deleted", "1");

  function pageHref(target: number) {
    const next = new URLSearchParams(preserved);
    next.set("page", String(target));
    return `/admin/security?${next.toString()}`;
  }

  return (
    <>
      <PageHeader eyebrow="OWNER boshqaruvi" title={messages.ownerTitle} subtitle={messages.ownerSubtitle} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={messages.ownerStatsUsers} value={userCount} />
        <Stat label={messages.ownerStatsDevices} value={deviceCount} />
        <Stat label={messages.ownerStatsLogins} value={logins24h} />
        <Stat label={messages.ownerStatsBlocked} value={blocked24h} />
      </div>

      <form action="/admin/security" method="get" className="mb-4">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-72">
              <Input
                name="q"
                defaultValue={query}
                placeholder={messages.filterPlaceholder}
                aria-label={messages.filterPlaceholder}
              />
            </div>
            <label className="inline-flex items-center gap-2 pb-2 text-sm text-slate-600">
              <input
                type="checkbox"
                name="deleted"
                value="1"
                defaultChecked={showDeleted}
                className="size-4 rounded border-slate-300"
              />
              {messages.showDeleted}
            </label>
            <Button type="submit" variant="secondary" className="gap-1.5">
              {messages.filter}
            </Button>
            {query || showDeleted ? (
              <Link
                href="/admin/security"
                className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {messages.clear}
              </Link>
            ) : null}
            <span className="ml-auto pb-2 text-xs text-slate-500">
              {messages.page}: {page} / {pageCount}
            </span>
          </CardBody>
        </Card>
      </form>

      <Card className="mb-6">
        <CardHeader title={messages.historyTitle} subtitle={messages.ownerSubtitle} />
        <CardBody className="px-0 py-0">
          <AdminSecurityTable items={loginItems} messages={messages} />
          {pageCount > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="font-medium text-brand-700 hover:underline">
                  ← {messages.prev}
                </Link>
              ) : (
                <span />
              )}
              {page < pageCount ? (
                <Link href={pageHref(page + 1)} className="font-medium text-brand-700 hover:underline">
                  {messages.next} →
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={messages.ownerDevicesTitle}
          subtitle={messages.ownerDevicesHint}
          action={<Badge tone="blue">{deviceCount}</Badge>}
        />
        <CardBody className="px-0 py-0">
          <AdminSecurityTable
            devices={deviceItems}
            messages={messages}
           
            devicesOnly
          />
        </CardBody>
      </Card>
    </>
  );
}
