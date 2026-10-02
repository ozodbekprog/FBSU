import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Stat, Table } from "@/components/ui";
import {
  BOUNTY_POINTS,
  BOUNTY_POINTS_DEFAULT,
  bountyLeaders,
  bountyPoints,
  fixerStats,
  readFix,
  readReporter,
  readSeverity,
} from "@/lib/bug-bounty";
import { cn, fmtDateTime } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; tone: string }> = {
  NEW: { label: "Yangi", tone: "amber" },
  IN_REVIEW: { label: "Ko'rib chiqilmoqda", tone: "blue" },
  FIXED: { label: "Tuzatildi", tone: "green" },
  REJECTED: { label: "Rad etildi", tone: "slate" },
};

const SEVERITY_META: Record<string, { label: string; tone: string }> = {
  high: { label: "Yuqori", tone: "rose" },
  medium: { label: "O'rta", tone: "amber" },
  low: { label: "Past", tone: "slate" },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  TEACHER: "O'qituvchi",
  STUDENT: "Talaba",
};

const FILTERS = [
  { key: "all", label: "Hammasi" },
  { key: "open", label: "Ochiq" },
  { key: "fixed", label: "Tuzatilgan" },
  { key: "rejected", label: "Rad etilgan" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function AdminBountyPage({
  searchParams,
}: {
  searchParams: Promise<{ holat?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const filter: FilterKey = FILTERS.some((item) => item.key === params.holat)
    ? (params.holat as FilterKey)
    : "all";

  const reports = await prisma.bugReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { name: true, role: true } } },
  });

  const items = reports.map((report) => {
    const reporter = readReporter(report.meta);
    const fix = readFix(report.meta);
    return {
      id: report.id,
      message: report.message,
      meta: report.meta,
      status: report.status as string,
      severity: readSeverity(report.meta),
      points: bountyPoints(report.status, report.meta),
      reporterName: report.user?.name ?? reporter.name,
      reporterRole: report.user?.role ?? reporter.role,
      fixWorker: fix.worker,
      createdAt: report.createdAt.toISOString(),
    };
  });

  const fixed = items.filter((item) => item.status === "FIXED").length;
  const open = items.filter((item) => item.status === "NEW" || item.status === "IN_REVIEW").length;
  const rejected = items.filter((item) => item.status === "REJECTED").length;
  const points = items.reduce((sum, item) => sum + item.points, 0);

  const leaders = bountyLeaders(
    items.map((item) => ({
      status: item.status,
      name: item.reporterName,
      role: item.reporterRole,
      meta: item.meta,
    })),
  );
  const fixers = fixerStats(items);

  const filtered = items.filter((item) => {
    if (filter === "open") return item.status === "NEW" || item.status === "IN_REVIEW";
    if (filter === "fixed") return item.status === "FIXED";
    if (filter === "rejected") return item.status === "REJECTED";
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Bug bounty"
        subtitle={`${items.length} ta xabar · ${fixed} ta tuzatilgan · ${points} ball`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Jami xabarlar" value={items.length} hint={`Ochiq: ${open}`} />
        <Stat label="Tuzatilgan" value={fixed} hint={`Rad etilgan: ${rejected}`} />
        <Stat label="Faol testchilar" value={leaders.length} hint="Ball to'plagan ishtirokchilar" />
        <Stat
          label="To'plangan ball"
          value={points}
          hint={`high=${BOUNTY_POINTS.high} · medium=${BOUNTY_POINTS.medium} · low=${BOUNTY_POINTS.low} · boshqa=${BOUNTY_POINTS_DEFAULT}`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top xatolik topuvchilar" subtitle="Faqat tuzatilgan xatolar ball beradi" />
          <CardBody className="pt-2">
            {leaders.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">Hozircha ball to'planmagan.</p>
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Ism</th>
                    <th className="py-2 pr-3 font-medium">Rol</th>
                    <th className="py-2 pr-3 text-right font-medium">Tuzatilgan</th>
                    <th className="py-2 pr-3 text-right font-medium">Jami</th>
                    <th className="py-2 text-right font-medium">Ball</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.slice(0, 10).map((leader, index) => (
                    <tr key={leader.name} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-3 text-sm text-slate-500">{index + 1}</td>
                      <td className="py-2.5 pr-3 text-sm font-medium text-slate-800">{leader.name}</td>
                      <td className="py-2.5 pr-3">
                        {leader.role ? (
                          <Badge tone="slate">{ROLE_LABELS[leader.role] ?? leader.role}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-sm text-slate-600">{leader.fixed}</td>
                      <td className="py-2.5 pr-3 text-right text-sm text-slate-500">{leader.total}</td>
                      <td className="py-2.5 text-right text-sm font-semibold text-emerald-700">
                        {leader.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tuzatuvchi node'lar" subtitle="Fleet ishchi kompyuterlari tuzatgan xatolar" />
          <CardBody className="pt-2">
            {fixers.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">Hozircha node hisobi yo'q.</p>
            ) : (
              <div className="space-y-2">
                {fixers.map((fixer) => (
                  <div
                    key={fixer.node}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5"
                  >
                    <span className="font-mono text-sm text-slate-700">{fixer.node}</span>
                    <Badge tone="green">{fixer.count} ta tuzatilgan</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Xatoliklar va ballar"
          subtitle={`${filtered.length} ta yozuv ko'rsatilmoqda`}
          action={
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((option) => (
                <Link
                  key={option.key}
                  href={option.key === "all" ? "/admin/bounty" : `/admin/bounty?holat=${option.key}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
                    filter === option.key
                      ? "border-brand-900 bg-brand-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          }
        />
        <CardBody className="pt-2">
          {filtered.length === 0 ? (
            <EmptyState title="Yozuvlar topilmadi" description="Boshqa filtrni tanlab ko'ring." />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">Sana</th>
                  <th className="py-2 pr-3 font-medium">Xabar</th>
                  <th className="py-2 pr-3 font-medium">Kim</th>
                  <th className="py-2 pr-3 font-medium">Holat</th>
                  <th className="py-2 pr-3 font-medium">Jiddiylik</th>
                  <th className="py-2 pr-3 text-right font-medium">Ball</th>
                  <th className="py-2 font-medium">Tuzatgan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((item) => {
                  const status = STATUS_META[item.status] ?? { label: item.status, tone: "slate" };
                  const severity = item.severity ? SEVERITY_META[item.severity] : null;
                  return (
                    <tr key={item.id} className="border-b border-slate-100 align-top last:border-0">
                      <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-slate-500">
                        {fmtDateTime(item.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="line-clamp-2 max-w-md text-sm text-slate-700">{item.message}</p>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-sm text-slate-600">
                        {item.reporterName ?? "Anonim"}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        {severity ? (
                          <Badge tone={severity.tone}>{severity.label}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-sm font-semibold text-emerald-700">
                        {item.points > 0 ? `+${item.points}` : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-xs text-slate-500">
                        {item.fixWorker ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
