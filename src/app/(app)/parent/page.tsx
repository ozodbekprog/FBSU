import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Progress,
} from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { getStudentAttendance } from "@/app/api/attendance/summary/data";
import { getStudentGpa } from "@/app/api/gpa/data";
import { SLOT_TIMES } from "@/components/attendance/lesson-utils";
import { isoWeekday } from "@/components/schedule/week-utils";
import { ChildCards } from "@/components/parent/child-cards";
import { dayName } from "@/lib/utils";

type TodayLesson = {
  id: string;
  slot: number;
  subject: string;
  room: string | null;
  teacher: string | null;
};

function lessonDetails(teacher: string | null, room: string | null) {
  return [teacher, room].filter((value): value is string => value != null).join(" · ");
}

export default async function ParentPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const user = await requireRole(["OTA_ONA"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { student: studentParam } = await searchParams;

  const links = await prisma.parentLink.findMany({
    where: { parentId: user.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          groupId: true,
          group: { select: { name: true } },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  if (links.length === 0) {
    return (
      <>
        <PageHeader title={dictionary.parentTitle} subtitle={dictionary.parentSubtitle} />
        <EmptyState title={dictionary.parentNoLink} />
      </>
    );
  }

  const selected = links.find((link) => link.student.id === studentParam) ?? links[0];
  const student = selected.student;

  const [attendance, gpa] = await Promise.all([
    getStudentAttendance(student.id),
    getStudentGpa(student.id),
  ]);

  const todayDow = isoWeekday(new Date());
  const lessons: TodayLesson[] = student.groupId
    ? await prisma.scheduleEntry.findMany({
        where: { groupId: student.groupId, dayOfWeek: todayDow },
        select: { id: true, slot: true, subject: true, room: true, teacher: true },
        orderBy: [{ slot: "asc" }, { id: "asc" }],
      })
    : [];

  const overall = attendance.overall;
  const eligibility = `${dictionary.parentEligible}: ${overall.eligible ? "HA" : "YO'Q"}`;

  return (
    <>
      <PageHeader
        title={dictionary.parentTitle}
        subtitle={student.name}
        action={student.group ? <Badge tone="slate">{student.group.name}</Badge> : undefined}
      />
      <div className="space-y-6">
        <ChildCards links={links} selectedId={student.id} label={dictionary.parentSwitch} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">{dictionary.parentAttendance}</p>
                <Badge tone={overall.eligible ? "green" : "rose"}>{eligibility}</Badge>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-brand-900">
                {`${overall.percent}%`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {overall.total > 0
                  ? `${overall.present + overall.late} / ${overall.total}`
                  : dictionary.parentEmpty}
              </p>
              <Progress value={overall.percent} className="mt-3" />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-sm font-medium text-slate-500">{dictionary.parentGpa}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-brand-900">
                {gpa.gpa == null ? "—" : gpa.gpa.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {gpa.overallPercent == null ? dictionary.parentEmpty : `${gpa.overallPercent}%`}
              </p>
            </CardBody>
          </Card>
        </div>

        {!overall.eligible ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-rose-700">{dictionary.parentWarnings}</p>
              <p className="mt-0.5 text-sm text-rose-600">{dictionary.parentRiskLow}</p>
            </div>
            <Badge tone="rose">{eligibility}</Badge>
          </div>
        ) : null}

        <Card>
          <CardHeader
            title={dictionary.parentToday}
            subtitle={dayName(new Date().getDay(), locale)}
          />
          <CardBody>
            {lessons.length === 0 ? (
              <EmptyState title={dictionary.parentEmpty} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{lesson.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {lessonDetails(lesson.teacher, lesson.room)}
                      </p>
                    </div>
                    <Badge tone="blue" className="shrink-0">
                      {SLOT_TIMES[lesson.slot]
                        ? `${lesson.slot}. ${SLOT_TIMES[lesson.slot]}`
                        : String(lesson.slot)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
