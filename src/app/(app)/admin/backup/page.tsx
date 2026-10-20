import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMaintenanceMode } from "@/server/maintenance";
import { getBackupCounts, type BackupCounts } from "@/app/api/admin/backup/data";
import BackupManager from "@/components/admin/BackupManager";
import CourseTransfer from "@/components/admin/course-transfer";

export const metadata = {
  title: "Zaxira | FBSU",
};

export default async function AdminBackupPage() {
  const user = await requireRole(["ADMIN", "TEACHER"]);
  const isAdmin = user.role === "ADMIN";

  const [counts, maintenance, courses] = await Promise.all([
    isAdmin
      ? getBackupCounts()
      : Promise.resolve<BackupCounts>({}),
    isAdmin ? getMaintenanceMode() : Promise.resolve(false),
    prisma.course.findMany({
      where: isAdmin
        ? {}
        : { OR: [{ teacherId: user.id }, { teacherIds: { has: user.id } }] },
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, title: true },
    }),
  ]);

  return (
    <div className="animate-fade-up">
      <div className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          Administrator
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-950">Zaxira va texnik xizmat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Asosiy jadvallarni JSON sifatida eksport qiling, kurslarni ko'chiring va texnik xizmat
          rejimini boshqaring.
        </p>
      </div>
      <div className="space-y-4">
        <CourseTransfer courses={courses} />
        {isAdmin ? (
          <BackupManager initialCounts={counts} initialMaintenance={maintenance} />
        ) : null}
      </div>
    </div>
  );
}
