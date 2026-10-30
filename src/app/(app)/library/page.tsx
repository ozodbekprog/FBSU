import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { PageHeader, Stat } from "@/components/ui";
import { hasCapability } from "@/modules/capabilities";
import { getActiveLoans, getCatalog, getCopies, getLibraryStats, getMyLoans } from "@/server/library";
import LibraryBoard from "@/components/library/library-board";

export default async function LibraryPage() {
  const user = await requireUser();
  const dictionary = getDictionary(await getLocale());
  const canManage = hasCapability(user.role, "library.manage");
  const canCirculate = hasCapability(user.role, "library.circulate");

  const [books, myLoans, stats, copies, activeLoans, students] = await Promise.all([
    getCatalog(""),
    getMyLoans(user.id),
    getLibraryStats(),
    canManage || canCirculate ? getCopies() : Promise.resolve([]),
    canCirculate ? getActiveLoans() : Promise.resolve([]),
    canCirculate
      ? prisma.user.findMany({
          where: { isActive: true, role: "STUDENT" },
          orderBy: { name: "asc" },
          take: 500,
          select: { id: true, name: true, group: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title={dictionary.libTitle} subtitle={dictionary.libSubtitle} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={dictionary.libTotalBooks} value={stats.titles} />
        <Stat label={dictionary.libTotalCopies} value={stats.copies} />
        <Stat label={dictionary.libActiveLoans} value={stats.active} />
        <Stat label={dictionary.libOverdueLoans} value={stats.overdue} />
      </div>

      <LibraryBoard
        books={books}
        copies={copies}
        activeLoans={activeLoans}
        myLoans={myLoans}
        students={students.map((student) => ({
          id: student.id,
          name: student.name,
          groupName: student.group?.name ?? null,
        }))}
        canManage={canManage}
        canCirculate={canCirculate}
      />
    </>
  );
}
