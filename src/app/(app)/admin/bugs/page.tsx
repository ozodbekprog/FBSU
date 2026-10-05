import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import AdminNav from "@/components/admin/AdminNav";
import { BugsManager } from "@/components/admin/BugsManager";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function AdminBugsPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const reports = await prisma.bugReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, role: true, email: true } } },
  });

  const items = reports.map((report) => ({
    id: report.id,
    url: report.url,
    message: report.message,
    stack: report.stack,
    meta: (report.meta ?? null) as Record<string, unknown> | null,
    status: report.status,
    adminNote: report.adminNote,
    createdAt: report.createdAt.toISOString(),
    user: report.user
      ? { name: report.user.name, role: report.user.role, email: report.user.email }
      : null,
  }));

  const open = items.filter((item) => item.status === "NEW" || item.status === "IN_REVIEW").length;

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowAdmin}
        title={dictionary.admBugs}
        subtitle={translate(locale, "admBugsSubtitle", { messages: items.length, open })}
      />
      <AdminNav />
      <div className="mt-6">
        <BugsManager reports={items} />
      </div>
    </>
  );
}
