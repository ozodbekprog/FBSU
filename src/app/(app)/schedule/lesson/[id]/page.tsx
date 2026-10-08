import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, Badge, ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { SLOT_TIMES, dateFromIso, matchCourseSlug, todayIso } from "@/components/attendance/lesson-utils";

const DAY_KEYS = [
  "schDaySunday",
  "schDayMonday",
  "schDayTuesday",
  "schDayWednesday",
  "schDayThursday",
  "schDayFriday",
  "schDaySaturday",
] as const;

const ATTENDANCE_BADGES: Record<
  string,
  {
    key:
      | "dashAttendancePresent"
      | "dashAttendanceLate"
      | "dashAttendanceExcused"
      | "dashAttendanceAbsent"
      | "dashAttendanceSuspicious"
      | "dashAttendanceLeftEarly";
    tone: "green" | "amber" | "blue" | "rose" | "slate";
  }
> = {
  PRESENT: { key: "dashAttendancePresent", tone: "green" },
  LATE: { key: "dashAttendanceLate", tone: "amber" },
  EXCUSED: { key: "dashAttendanceExcused", tone: "blue" },
  ABSENT: { key: "dashAttendanceAbsent", tone: "rose" },
  SUSPICIOUS: { key: "dashAttendanceSuspicious", tone: "amber" },
  LEFT_EARLY: { key: "dashAttendanceLeftEarly", tone: "slate" },
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{children}</span>
    </div>
  );
}

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { id } = await params;

  const entry = await prisma.scheduleEntry.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true } },
      subjectRef: { select: { name: true, code: true, department: { select: { name: true } } } },
      teacherRef: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          department: { select: { name: true } },
        },
      },
    },
  });
  if (!entry) notFound();

  const subjectName = entry.subjectRef?.name ?? entry.subject;
  const teacherName = entry.teacherRef?.name ?? entry.teacher ?? null;

  let matchedCourse: { id: string; slug: string; title: string } | null = null;
  if (user.role === "STUDENT") {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: { course: { select: { id: true, slug: true, title: true } } },
    });
    const courses = enrollments.map((row) => row.course);
    const slug = matchCourseSlug(
      subjectName,
      courses.map((course) => ({ slug: course.slug, title: course.title })),
    );
    matchedCourse = courses.find((course) => course.slug === slug) ?? null;
  } else if (user.role === "TEACHER" && entry.teacherId === user.id) {
    const courses = await prisma.course.findMany({
      where: { teacherId: user.id },
      select: { id: true, slug: true, title: true },
      orderBy: { title: "asc" },
    });
    const slug = matchCourseSlug(
      subjectName,
      courses.map((course) => ({ slug: course.slug, title: course.title })),
    );
    matchedCourse = courses.find((course) => course.slug === slug) ?? null;
  }

  const isToday = entry.dayOfWeek % 7 === new Date().getDay();
  const attendance =
    user.role === "STUDENT" && matchedCourse
      ? await prisma.attendance.findUnique({
          where: {
            courseId_studentId_date: {
              courseId: matchedCourse.id,
              studentId: user.id,
              date: dateFromIso(todayIso()),
            },
          },
          select: { status: true },
        })
      : null;
  const badge = attendance ? ATTENDANCE_BADGES[attendance.status] : undefined;

  const dayKey = DAY_KEYS[entry.dayOfWeek % 7];
  const pairNumber = translate(locale, "dashPairNumber", { slot: entry.slot });
  const timeRange = SLOT_TIMES[entry.slot] ?? null;
  const canMark = user.role === "TEACHER" && entry.teacherId === user.id && matchedCourse;

  return (
    <>
      <PageHeader
        eyebrow={dictionary.navSchedule}
        title={subjectName}
        subtitle={`${entry.group.name} · ${dictionary[dayKey]} · ${pairNumber}`}
      />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={dictionary.schLessonAbout} subtitle={dictionary.schLessonDetailSubtitle} />
            <CardBody className="divide-y divide-slate-100 py-1.5">
              <DetailRow label={dictionary.schLessonWhen}>
                {dictionary[dayKey]}
                {timeRange ? `, ${timeRange}` : ""} · {pairNumber}
              </DetailRow>
              <DetailRow label={dictionary.schRoom}>{entry.room ?? dictionary.schNoRoom}</DetailRow>
              <DetailRow label={dictionary.schGroup}>
                {entry.group.name}
                {entry.subGroup ? ` · ${entry.subGroup}` : ""}
              </DetailRow>
              {entry.lessonType ? (
                <DetailRow label={dictionary.schLessonType}>{entry.lessonType}</DetailRow>
              ) : null}
              {entry.parity ? (
                <DetailRow label={dictionary.schWeekType}>
                  {entry.parity === "odd" ? dictionary.schOddWeek : dictionary.schEvenWeek}
                </DetailRow>
              ) : null}
              {entry.note ? <DetailRow label={dictionary.schLessonNote}>{entry.note}</DetailRow> : null}
            </CardBody>
          </Card>

          {user.role === "STUDENT" ? (
            <Card>
              <CardHeader
                title={dictionary.schLessonYourStatus}
                subtitle={isToday ? dictionary.schLessonToday : dictionary.schLessonNotTodayHint}
              />
              <CardBody className="flex flex-wrap items-center gap-3">
                {badge ? (
                  <Badge tone={badge.tone}>{translate(locale, badge.key)}</Badge>
                ) : (
                  <Badge tone="slate">{dictionary.dashNotMarked}</Badge>
                )}
                {matchedCourse ? (
                  <>
                    <ButtonLink
                      href={`/courses/${matchedCourse.slug}`}
                      size="sm"
                      variant="secondary"
                    >
                      {dictionary.schLessonGoCourse}
                    </ButtonLink>
                    <ButtonLink
                      href={`/courses/${matchedCourse.slug}/assignments`}
                      size="sm"
                      variant="secondary"
                    >
                      {dictionary.dashActionAssignments}
                    </ButtonLink>
                  </>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {canMark && matchedCourse ? (
            <Card>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{matchedCourse.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{dictionary.schLessonJournal}</p>
                </div>
                <ButtonLink
                  href={`/courses/${matchedCourse.slug}/attendance/lesson?date=${todayIso()}&slot=${entry.slot}`}
                  size="sm"
                >
                  {dictionary.schLessonJournal}
                </ButtonLink>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={dictionary.schLessonTeacherSection} />
            <CardBody className="space-y-4">
              {teacherName ? (
                <div className="flex items-center gap-3">
                  <Avatar name={teacherName} src={entry.teacherRef?.avatarUrl ?? null} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{teacherName}</p>
                    {entry.teacherRef?.department?.name ? (
                      <p className="truncate text-xs text-slate-500">
                        {entry.teacherRef.department.name}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{dictionary.schWithoutTeacher}</p>
              )}
              {entry.teacherRef?.bio ? (
                <p className="text-sm leading-relaxed text-slate-600">{entry.teacherRef.bio}</p>
              ) : null}
              {entry.teacherRef?.email ? (
                <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {dictionary.schLessonEmail}
                  </span>
                  <span className="mt-0.5 block break-all text-sm font-medium text-slate-800">
                    {entry.teacherRef.email}
                  </span>
                </div>
              ) : null}
              {entry.teacherId ? (
                <ButtonLink
                  href={`/users/${entry.teacherId}`}
                  size="sm"
                  variant="secondary"
                  className="w-full"
                >
                  {dictionary.schLessonProfile}
                </ButtonLink>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={dictionary.schLessonConsultation} />
            <CardBody>
              <p className="text-sm leading-relaxed text-slate-600">
                {dictionary.schLessonConsultationHint}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
