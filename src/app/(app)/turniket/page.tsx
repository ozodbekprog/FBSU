import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL_KEY } from "@/components/profile/ProfileHero";
import { canViewAccessLogs, canScanAccess } from "@/modules/roles/access";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Table } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { AccessKiosk } from "@/components/access/access-kiosk";

export default async function TurniketPage() {
  const user = await requireUser();
  if (!canViewAccessLogs(user.role)) redirect("/dashboard");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const canScan = canScanAccess(user.role);

  const logs = await prisma.accessLog.findMany({
    orderBy: { at: "desc" },
    take: 20,
    include: { user: { select: { name: true, role: true } } },
  });

  return (
    <>
      <PageHeader title={dictionary.accTitle} subtitle={dictionary.accSubtitle} />
      {canScan ? <AccessKiosk /> : null}
      <div className="mt-6">
        <Card>
          <CardHeader title={dictionary.accLogs} subtitle={dictionary.accLogsSubtitle} />
          {logs.length === 0 ? (
            <CardBody>
              <EmptyState title={dictionary.accEmpty} />
            </CardBody>
          ) : (
            <Table>
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="border-b border-slate-100 px-6 py-3 font-semibold">{dictionary.accPerson}</th>
                  <th className="border-b border-slate-100 px-6 py-3 font-semibold">{dictionary.accDirection}</th>
                  <th className="border-b border-slate-100 px-6 py-3 font-semibold">{dictionary.accTime}</th>
                  <th className="border-b border-slate-100 px-6 py-3 font-semibold">{dictionary.accAllowed}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3">
                      <span className="block font-medium text-slate-900">{log.user?.name ?? "—"}</span>
                      {log.user ? (
                        <span className="block text-xs text-slate-500">
                          {dictionary[ROLE_LABEL_KEY[log.user.role]] ?? log.user.role}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-3">
                      <Badge tone={log.direction === "IN" ? "green" : "amber"}>
                        {log.direction === "IN" ? dictionary.accIn : dictionary.accOut}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{fmtDateTime(log.at)}</td>
                    <td className="px-6 py-3">
                      <Badge tone={log.allowed ? "green" : "rose"}>
                        {log.allowed ? "✓" : dictionary.accDenied}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}