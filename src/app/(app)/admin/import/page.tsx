import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import ImportManager from "@/components/admin/ImportManager";
import { EduPageSyncCard } from "@/components/admin/EduPageSyncCard";
import { edupageBaseUrl } from "@/lib/edupage";
import { readEduPageSyncState } from "@/lib/edupage-sync";
import { getDictionary, getLocale } from "@/i18n";

export default async function AdminImportPage() {
  const user = await requireRole(["ADMIN", "REGISTRAR"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const [syncState, groups, teachers, subjects, rooms, lessons] = await Promise.all([
    readEduPageSyncState(),
    prisma.group.count(),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.subject.count(),
    prisma.room.count(),
    prisma.scheduleEntry.count({ where: { source: "edupage" } }),
  ]);

  return (
    <>
      <PageHeader
        title={dictionary.admImportPageTitle}
        subtitle={dictionary.admImportPageSubtitle}
      />
      {user.role === "REGISTRAR" ? (
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          {dictionary.admImportRegistrarHint}
        </p>
      ) : null}
      <EduPageSyncCard
        lastSyncAt={syncState.at}
        label={syncState.label}
        stats={{ groups, teachers, subjects, rooms, lessons }}
        sourceUrl={`${edupageBaseUrl()}/timetable/`}
      />
      <ImportManager />
    </>
  );
}
