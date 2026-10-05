import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { buildGroupDetail, getCuratorGroups } from "@/app/api/curator/data";
import { ButtonLink, Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CuratorStudentsTable } from "@/components/curator/students-table";
import { ReportSendButton } from "@/components/curator/report-send";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function CuratorGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const { id } = await params;

  const allowed = await getCuratorGroups(user, id);
  if (allowed.length === 0) notFound();

  const group = await buildGroupDetail(id);
  if (!group) notFound();

  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const problematic = group.students.filter((student) => student.problematic);

  return (
    <>
      <PageHeader
        title={group.name}
        eyebrow={dictionary.admCuratorTitle}
        subtitle={translate(locale, group.curator ? "admCuratorSubtitleWithCurator" : "admCuratorStudentsSubtitle", {
          count: group.studentCount,
          curator: group.curator?.name ?? "",
        })}
        action={
          <ButtonLink href="/curator" variant="secondary" size="sm">
            {dictionary.admCuratorBack}
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={dictionary.admStudents}
          value={group.studentCount}
          hint={group.year ? translate(locale, "admCuratorStatStudentsHintYear", { year: group.year }) : dictionary.admCuratorStatStudentsHint}
        />
        <Stat
          label={dictionary.admCuratorStatAttendance}
          value={group.averageAttendance !== null ? `${group.averageAttendance}%` : "—"}
          hint={dictionary.admCuratorStatAttendanceHint}
        />
        <Stat
          label={dictionary.admCuratorStatLowAttendance}
          value={group.lowAttendanceCount}
          hint={dictionary.admCuratorStatLowAttendanceHint}
        />
        <Stat
          label={dictionary.admCuratorStatGpa}
          value={group.averageGpa !== null ? group.averageGpa.toFixed(2) : "—"}
          hint={dictionary.admCuratorStatGpaHint}
        />
      </div>

      {problematic.length > 0 ? (
        <Card className="mt-6 border-amber-200/70">
          <CardHeader
            title={translate(locale, "admCuratorProblematic", { count: problematic.length })}
            subtitle={dictionary.admCuratorProblematicSubtitle}
          />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {problematic.map((student) => (
                <span
                  key={student.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
                    student.attendance.eligible
                      ? "bg-amber-50 text-amber-700 ring-amber-200/70"
                      : "bg-rose-50 text-rose-700 ring-rose-200/70",
                  )}
                >
                  <span className="font-semibold">{student.name}</span>
                  <span>{translate(locale, "admCuratorAttendanceShort", { percent: student.attendance.percent })}</span>
                  <span>
                    GPA {student.gpa !== null ? student.gpa.toFixed(2) : "—"}
                  </span>
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader
          title={dictionary.admCuratorStudentsTable}
          subtitle={translate(locale, "admCuratorStudentsSubtitle", { count: group.studentCount })}
        />
        <CardBody>
          <CuratorStudentsTable students={group.students} />
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title={dictionary.admCuratorWeeklyReport}
          subtitle={dictionary.admCuratorWeeklyReportSubtitle}
          action={<ReportSendButton groupId={group.id} />}
        />
      </Card>
    </>
  );
}
