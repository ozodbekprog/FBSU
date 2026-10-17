import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button, Card, CardBody, Input, Label, PageHeader, Select } from "@/components/ui";
import AuditLogTable, { type AuditLogItem } from "@/components/admin/AuditLogTable";
import { auditActionLabel } from "./labels";
import { getDictionary, getLocale, t as translate, type Dictionary } from "@/i18n";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  EVENTS,
  eventsByCategory,
  isEventName,
  type EventCategory,
} from "@/modules/events";

const PAGE_SIZE = 100;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; date?: string; category?: string; actor?: string; page?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const tr = (key: keyof Dictionary, params?: Record<string, string | number>) => translate(locale, key, params);
  const params = await searchParams;

  const action = typeof params.action === "string" ? params.action.trim() : "";
  const date = typeof params.date === "string" ? params.date.trim() : "";
  const actor = typeof params.actor === "string" ? params.actor.trim() : "";
  const categoryRaw = typeof params.category === "string" ? params.category.trim() : "";
  const category = (EVENT_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as EventCategory)
    : "";
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const dayStart = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : null;
  const dayEnd = dayStart ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : null;

  const where: Prisma.AuditLogWhereInput = {};
  if (action) {
    where.action = action;
  } else if (category) {
    where.action = { in: eventsByCategory(category) };
  }
  if (dayStart && dayEnd) where.createdAt = { gte: dayStart, lt: dayEnd };
  if (actor) where.actorId = actor;

  const [total, logs, actionGroups, actorGroups] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: { _all: true },
      orderBy: { action: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { actorId: { not: null } },
      distinct: ["actorId"],
      select: { actorId: true },
      take: 200,
    }),
  ]);

  const actorIds = actorGroups.flatMap((group) => (group.actorId ? [group.actorId] : []));
  const actorUsers =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  const categoryCounts = new Map<EventCategory, number>();
  for (const group of actionGroups) {
    if (!isEventName(group.action)) continue;
    const key = EVENTS[group.action].category;
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + group._count._all);
  }

  const items: AuditLogItem[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    meta: log.meta,
    createdAt: log.createdAt,
    actor: log.actor,
  }));

  const hasFilters = Boolean(action || category || date || actor);

  return (
    <>
      <PageHeader eyebrow={dictionary.admEyebrowManage} title={dictionary.admAuditTitle} subtitle={translate(locale, "admAuditSubtitle", { total })} />

      <form action="/admin/audit" method="get" className="mb-4">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-64">
              <Label>{dictionary.admAuditActionLabel}</Label>
              <Select name="action" defaultValue={action}>
                <option value="">{dictionary.admAuditAllActions}</option>
                {actionGroups.map((group) => (
                  <option key={group.action} value={group.action}>
                    {auditActionLabel(group.action, tr)} ({group._count._all})
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-56">
              <Label>{dictionary.auditCategoryLabel}</Label>
              <Select name="category" defaultValue={category}>
                <option value="">{dictionary.auditAllCategories}</option>
                {EVENT_CATEGORIES.map((item) =>
                  categoryCounts.get(item) ? (
                    <option key={item} value={item}>
                      {EVENT_CATEGORY_LABELS[item]} ({categoryCounts.get(item)})
                    </option>
                  ) : null,
                )}
              </Select>
            </div>
            <div className="w-full sm:w-56">
              <Label>{dictionary.auditUserLabel}</Label>
              <Select name="actor" defaultValue={actor}>
                <option value="">{dictionary.auditAllUsers}</option>
                {actorUsers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Label>{dictionary.admDateLabel}</Label>
              <Input type="date" name="date" defaultValue={date} />
            </div>
            <Button type="submit" variant="secondary" className="gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              {dictionary.admFilter}
            </Button>
            {hasFilters ? (
              <Link
                href="/admin/audit"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
                {dictionary.admClear}
              </Link>
            ) : null}
          </CardBody>
        </Card>
      </form>

      <AuditLogTable
        logs={items}
        total={total}
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        query={{ action, date, category, actor }}
      />
    </>
  );
}
