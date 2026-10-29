import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentDeviceId } from "@/lib/device";
import { getLocale } from "@/i18n";
import { PageHeader } from "@/components/ui";
import SecurityCenter from "@/components/security/SecurityCenter";
import { securityMessages } from "@/components/security/messages";
import type {
  SecurityChangeItem,
  SecurityDeviceItem,
  SecurityLoginItem,
} from "@/components/security/types";

function locationLabel(city: string | null, country: string | null): string {
  return [city, country].filter(Boolean).join(", ") || "—";
}

export default async function SecuritySettingsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const messages = securityMessages(locale);

  const [devices, logins, currentId] = await Promise.all([
    prisma.trustedDevice.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        platform: true,
        browser: true,
        createdAt: true,
        lastSeenAt: true,
        lastIp: true,
        ip: true,
        city: true,
        country: true,
      },
    }),
    prisma.loginRecord.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        deviceName: true,
        ip: true,
        location: true,
        method: true,
        status: true,
        createdAt: true,
        note: true,
        editedAt: true,
      },
    }),
    currentDeviceId(user.id),
  ]);

  const sessionIds = logins.filter((login) => login.status === "SUCCESS").map((login) => login.id);
  const auditLogs = sessionIds.length
    ? await prisma.auditLog.findMany({
        where: { sessionId: { in: sessionIds } },
        orderBy: { createdAt: "asc" },
        take: 2000,
        select: { id: true, action: true, entity: true, createdAt: true, sessionId: true },
      })
    : [];

  const changesBySession = new Map<string, SecurityChangeItem[]>();
  for (const log of auditLogs) {
    if (!log.sessionId) continue;
    const list = changesBySession.get(log.sessionId) ?? [];
    list.push({
      id: log.id,
      action: log.action,
      entity: log.entity,
      createdAt: log.createdAt.toISOString(),
    });
    changesBySession.set(log.sessionId, list);
  }

  const deviceItems: SecurityDeviceItem[] = devices.map((device) => ({
    id: device.id,
    name: device.name,
    platform: device.platform,
    browser: device.browser,
    createdAt: device.createdAt.toISOString(),
    lastSeenAt: device.lastSeenAt.toISOString(),
    ip: device.lastIp ?? device.ip,
    location: locationLabel(device.city, device.country),
    isCurrent: device.id === currentId,
  }));

  const loginItems: SecurityLoginItem[] = logins.map((login) => ({
    id: login.id,
    deviceName: login.deviceName,
    ip: login.ip,
    location: login.location ?? "—",
    method: login.method,
    status: login.status,
    createdAt: login.createdAt.toISOString(),
    note: login.note,
    editedByOwner: login.editedAt !== null,
    changes: changesBySession.get(login.id) ?? [],
  }));

  return (
    <>
      <PageHeader eyebrow="Xavfsizlik" title={messages.title} subtitle={messages.subtitle} />
      <SecurityCenter devices={deviceItems} logins={loginItems} messages={messages} />
    </>
  );
}
