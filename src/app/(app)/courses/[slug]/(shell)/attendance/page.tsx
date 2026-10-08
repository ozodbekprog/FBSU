import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Stat,
  Table,
} from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { canManageCourse } from "@/components/courses/course-access";
import { AttendanceBulk } from "@/components/courses/attendance-bulk";
import { SessionPanel } from "@/components/attendance/SessionPanel";

const STATUS_TONES: Record<string, "green" | "rose" | "amber" | "blue" | "purple"> = {
  PRESENT: "green",
  ABSENT: "rose",
  LATE: "amber",
  EXCUSED: "blue",
  SUSPICIOUS: "purple",
  LEFT_EARLY: "amber",
};

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function CourseAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const user = await requireUser();
  const { start } = await searchParams;
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const statusLabels: Record<string, string> = {
    PRESENT: dictionary.crsPresent,
    ABSENT: dictionary.crsAbsent,
    LATE: dictionary.crsLate,
    EXCUSED: dictionary.crsExcused,
    SUSPICIOUS: dictionary.crsSuspicious,
    LEFT_EARLY: dictionary.crsLeftEarly,
  };
  const { slug } = await params;

  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) notFound();

  const management = canManageCourse(user, course);
  const journal = (
    <ButtonLink href={`/courses/${course.slug}/attendance/journal`} variant="secondary" size="sm">
      {dictionary.crsGroupJournal}
    </ButtonLink>
  );

  if (user.role === "STUDENT") {
    const enrolled = await prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId: user.id }, status: "ACTIVE" },
    });
    if (!enrolled) notFound();

    const entries = await prisma.attendance.findMany({
      where: { courseId: course.id, studentId: user.id },
      orderBy: { date: "desc" },
    });

    const total = entries.length;
    const present = entries.filter((entry) => entry.status === "PRESENT").length;
    const late = entries.filter((entry) => entry.status === "LATE").length;
    const absent = entries.filter((entry) => entry.status === "ABSENT").length;
    const excused = entries.filter((entry) => entry.status === "EXCUSED").length;
    const percent = total ? Math.round(((present + late) / total) * 100) : 0;

    return (
      <>
        <div className="mb-5 flex items-center justify-end gap-2">{journal}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={dictionary.crsAttendancePercent} value={`${percent}%`} hint={translate(locale, "crsLessonsCount", { count: total })} />
          <Stat label={dictionary.crsPresent} value={present} />
          <Stat label={dictionary.crsLate} value={late} />
          <Stat label={dictionary.crsAbsentExcused} value={`${absent} / ${excused}`} />
        </div>
        <Card className="mt-6">
          <CardHeader title={dictionary.crsAttendanceHistory} subtitle={translate(locale, "crsRecordsCount", { count: total })} />
          <CardBody>
            {entries.length === 0 ? (
              <EmptyState title={dictionary.crsNoData} description={dictionary.crsNoAttendanceMarked} />
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2.5 pr-3 text-left font-medium">{dictionary.crsDate}</th>
                    <th className="px-3 py-2.5 text-left font-medium">{dictionary.crsStatus}</th>
                    <th className="px-3 py-2.5 text-left font-medium">{dictionary.crsNote}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="transition-colors duration-150 hover:bg-slate-50/70">
                      <td className="py-3 pr-3 text-sm text-slate-700">{fmtDate(entry.date)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={STATUS_TONES[entry.status]}>{statusLabels[entry.status]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">{entry.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </>
    );
  }

  if (!management) notFound();

  const [enrollments, entries] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId: course.id, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.attendance.findMany({
      where: { courseId: course.id },
      orderBy: { date: "desc" },
      take: 600,
    }),
  ]);

  const students = enrollments.map((enrollment) => enrollment.user);

  const byDate = new Map<
    string,
    { present: number; absent: number; late: number; excused: number }
  >();
  for (const entry of entries) {
    const key = dateKey(entry.date);
    const summary = byDate.get(key) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    if (entry.status === "PRESENT") summary.present += 1;
    else if (entry.status === "ABSENT") summary.absent += 1;
    else if (entry.status === "LATE") summary.late += 1;
    else summary.excused += 1;
    byDate.set(key, summary);
  }
  const summaryRows = [...byDate.entries()].slice(0, 14);

  return (
    <>
      <div className="mb-5 flex items-center justify-end gap-2">{journal}</div>
      <SessionPanel courseId={course.id} courseTitle={course.title} studentCount={students.length} autoStart={start === "1"} />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <AttendanceBulk
          courseId={course.id}
          students={students}
          entries={entries.map((entry) => ({
            studentId: entry.studentId,
            date: dateKey(entry.date),
            status: entry.status,
          }))}
        />
        <Card>
          <CardHeader title={dictionary.crsRecentDays} subtitle={dictionary.crsStatusSummary} />
          <CardBody>
            {summaryRows.length === 0 ? (
              <p className="text-sm text-slate-500">{dictionary.crsNoAttendanceMarked}</p>
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2.5 pr-3 text-left font-medium">{dictionary.crsDate}</th>
                    <th className="px-3 py-2.5 text-left font-medium">{dictionary.crsPresent}</th>
                    <th className="px-3 py-2.5 text-left font-medium">{dictionary.crsAbsent}</th>
                    <th className="px-3 py-2.5 text-left font-medium">{dictionary.crsLateShort}</th>
                    <th className="px-3 py-2.5 text-left font-medium">{dictionary.crsExcused}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryRows.map(([date, summary]) => (
                    <tr key={date} className="transition-colors duration-150 hover:bg-slate-50/70">
                      <td className="py-3 pr-3 text-sm text-slate-700">{fmtDate(date)}</td>
                      <td className="px-3 py-3 text-sm font-medium text-emerald-600">{summary.present}</td>
                      <td className="px-3 py-3 text-sm font-medium text-rose-600">{summary.absent}</td>
                      <td className="px-3 py-3 text-sm font-medium text-amber-600">{summary.late}</td>
                      <td className="px-3 py-3 text-sm font-medium text-blue-600">{summary.excused}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
