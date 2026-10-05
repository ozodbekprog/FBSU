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
import { getDictionary, getLocale, t as translate, type Dictionary } from "@/i18n";

const STATUS_META: Record<string, { label: keyof Dictionary; tone: string }> = {
  NEW: { label: "admStatusNew", tone: "amber" },
  IN_REVIEW: { label: "admStatusInReview", tone: "blue" },
  FIXED: { label: "admStatusFixed", tone: "green" },
  REJECTED: { label: "admStatusRejected", tone: "slate" },
};

const SEVERITY_META: Record<string, { label: keyof Dictionary; tone: string }> = {
  high: { label: "admSeverityHigh", tone: "rose" },
  medium: { label: "admSeverityMedium", tone: "amber" },
  low: { label: "admSeverityLow", tone: "slate" },
};

const ROLE_LABELS: Record<string, keyof Dictionary> = {
  ADMIN: "admRoleAdmin",
  TEACHER: "admRoleTeacher",
  STUDENT: "admRoleStudent",
};

const FILTERS: { key: string; label: keyof Dictionary }[] = [
  { key: "all", label: "admFilterAll" },
  { key: "open", label: "admFilterOpen" },
  { key: "fixed", label: "admFilterFixed" },
  { key: "rejected", label: "admFilterRejected" },
];

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function AdminBountyPage({
  searchParams,
}: {
  searchParams: Promise<{ holat?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
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
        eyebrow={dictionary.admEyebrowAdmin}
        title={dictionary.admBountyTitle}
        subtitle={translate(locale, "admBountySubtitle", { messages: items.length, fixed, points })}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={dictionary.admBountyStatMessages} value={items.length} hint={translate(locale, "admBountyStatMessagesHint", { open })} />
        <Stat label={dictionary.admBountyStatFixed} value={fixed} hint={translate(locale, "admBountyStatFixedHint", { rejected })} />
        <Stat label={dictionary.admBountyStatTesters} value={leaders.length} hint={dictionary.admBountyStatTestersHint} />
        <Stat
          label={dictionary.admBountyStatPoints}
          value={points}
          hint={translate(locale, "admBountyStatPointsHint", { high: BOUNTY_POINTS.high, medium: BOUNTY_POINTS.medium, low: BOUNTY_POINTS.low, other: BOUNTY_POINTS_DEFAULT })}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={dictionary.admBountyLeadersTitle} subtitle={dictionary.admBountyLeadersSubtitle} />
          <CardBody className="pt-2">
            {leaders.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">{dictionary.admBountyLeadersEmpty}</p>
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3 font-medium">{dictionary.admColIndex}</th>
                    <th className="py-2 pr-3 font-medium">{dictionary.admColName}</th>
                    <th className="py-2 pr-3 font-medium">{dictionary.admColRole}</th>
                    <th className="py-2 pr-3 text-right font-medium">{dictionary.admColFixed}</th>
                    <th className="py-2 pr-3 text-right font-medium">{dictionary.admTotal}</th>
                    <th className="py-2 text-right font-medium">{dictionary.admPoints}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.slice(0, 10).map((leader, index) => (
                    <tr key={leader.name} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-3 text-sm text-slate-500">{index + 1}</td>
                      <td className="py-2.5 pr-3 text-sm font-medium text-slate-800">{leader.name}</td>
                      <td className="py-2.5 pr-3">
                        {leader.role ? (
                          <Badge tone="slate">{ROLE_LABELS[leader.role] ? dictionary[ROLE_LABELS[leader.role]] : leader.role}</Badge>
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
          <CardHeader title={dictionary.admBountyFixersTitle} subtitle={dictionary.admBountyFixersSubtitle} />
          <CardBody className="pt-2">
            {fixers.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">{dictionary.admBountyFixersEmpty}</p>
            ) : (
              <div className="space-y-2">
                {fixers.map((fixer) => (
                  <div
                    key={fixer.node}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5"
                  >
                    <span className="font-mono text-sm text-slate-700">{fixer.node}</span>
                    <Badge tone="green">{translate(locale, "admBountyFixersBadge", { count: fixer.count })}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title={dictionary.admBountyReportsTitle}
          subtitle={translate(locale, "admBountyReportsSubtitle", { count: filtered.length })}
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
                  {dictionary[option.label]}
                </Link>
              ))}
            </div>
          }
        />
        <CardBody className="pt-2">
          {filtered.length === 0 ? (
            <EmptyState title={dictionary.admBountyEmptyTitle} description={dictionary.admBountyEmptyDesc} />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">{dictionary.admBountyColDate}</th>
                  <th className="py-2 pr-3 font-medium">{dictionary.admBountyColMessage}</th>
                  <th className="py-2 pr-3 font-medium">{dictionary.admBountyColWho}</th>
                  <th className="py-2 pr-3 font-medium">{dictionary.admBountyColStatus}</th>
                  <th className="py-2 pr-3 font-medium">{dictionary.admBountyColSeverity}</th>
                  <th className="py-2 pr-3 text-right font-medium">{dictionary.admPoints}</th>
                  <th className="py-2 font-medium">{dictionary.admBountyColFixer}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((item) => {
                  const status = STATUS_META[item.status] ?? { label: null, tone: "slate" };
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
                        {item.reporterName ?? dictionary.admAnonymous}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={status.tone}>{status.label ? dictionary[status.label] : item.status}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        {severity ? (
                          <Badge tone={severity.tone}>{dictionary[severity.label]}</Badge>
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
