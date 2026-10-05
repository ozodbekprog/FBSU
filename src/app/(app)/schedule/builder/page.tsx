import { redirect } from "next/navigation";
import { isStaff, isRegistrar, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { ScheduleBuilder } from "@/components/schedule/builder/schedule-builder";
import type {
  BuilderCourse,
  BuilderEntry,
  BuilderGroup,
  BuilderSubject,
  BuilderTeacherRef,
} from "@/components/schedule/builder/types";
import {
  MONTH_KEYS,
  formatWeekRange,
  isoWeekNumber,
  resolveWeekStart,
  weekParityOf,
} from "@/components/schedule/week-utils";

const STANDARD_ROOMS = ["203", "205", "304", "LAB 403", "Green Hall", "Yellow Hall", "Conference Hall"];

export default async function ScheduleBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!isStaff(user.role) && !isRegistrar(user.role)) redirect("/schedule");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const months = MONTH_KEYS.map((key) => dictionary[key]);
  const params = await searchParams;
  const groups: BuilderGroup[] = await prisma.group.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const requestedGroup = typeof params.groupId === "string" ? params.groupId : null;
  const selectedGroup = groups.find((group) => group.id === requestedGroup) ?? groups[0] ?? null;
  const weekStart = resolveWeekStart(typeof params.week === "string" ? params.week : null);
  const weekParity = weekParityOf(weekStart);

  if (!selectedGroup) {
    return (
      <>
        <PageHeader title={dictionary.schBuilderTitle} subtitle={dictionary.schBuilderSubtitle} />
        <EmptyState
          title={dictionary.schBuilderGroupsEmptyTitle}
          description={dictionary.schBuilderGroupsEmptyDesc}
        />
      </>
    );
  }

  const rowEntries = await prisma.scheduleEntry.findMany({
    where: { groupId: selectedGroup.id },
    orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
    include: {
      subjectRef: { select: { name: true, color: true } },
      teacherRef: { select: { id: true, name: true } },
    },
  });

  const courseRows = await prisma.course.findMany({
    where: user.role === "ADMIN" || user.role === "REGISTRAR" ? {} : { teacherId: user.id },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      subjectId: true,
      coverColor: true,
      teacher: { select: { name: true } },
    },
  });
  const courses: BuilderCourse[] = courseRows.map((course) => ({
    id: course.id,
    title: course.title,
    teacherName: course.teacher.name,
    subjectId: course.subjectId,
    coverColor: course.coverColor,
  }));

  let mySubjects: BuilderSubject[] = [];
  if (user.role === "TEACHER") {
    const attached = await prisma.teacherSubject.findMany({
      where: { teacherId: user.id },
      orderBy: { subject: { name: "asc" } },
      select: { subject: { select: { id: true, name: true, color: true } } },
    });
    mySubjects = attached.map(({ subject }) => ({ id: subject.id, name: subject.name, color: subject.color }));
  }

  let myGroupIds: string[] = [];
  if (user.role === "TEACHER") {
    const enrollments = await prisma.enrollment.findMany({
      where: { course: { teacherId: user.id }, user: { groupId: { not: null } }, status: "ACTIVE" },
      select: { user: { select: { groupId: true } } },
    });
    const taught = new Set<string>();
    for (const row of enrollments) {
      if (row.user.groupId) taught.add(row.user.groupId);
    }
    myGroupIds = groups.filter((group) => taught.has(group.id)).map((group) => group.id);
  }

  const roomSet = new Set<string>([...STANDARD_ROOMS, dictionary.schOnlineRoom]);
  const existingRooms = await prisma.scheduleEntry.findMany({
    where: { room: { not: null } },
    select: { room: true },
    distinct: ["room"],
  });
  for (const row of existingRooms) {
    if (row.room) roomSet.add(row.room);
  }

  const teacherSet = new Map<string, BuilderTeacherRef>();
  if (user.role === "ADMIN" || user.role === "REGISTRAR") {
    const teacherRows = await prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    for (const row of teacherRows) teacherSet.set(row.name, row);
    const entryTeacherRows = await prisma.scheduleEntry.findMany({
      where: { teacher: { not: null } },
      select: { teacher: true },
      distinct: ["teacher"],
    });
    for (const row of entryTeacherRows) {
      if (row.teacher && !teacherSet.has(row.teacher)) teacherSet.set(row.teacher, { id: "", name: row.teacher });
    }
  }

  const entries: BuilderEntry[] = rowEntries.map((entry) => ({
    id: entry.id,
    groupId: entry.groupId,
    dayOfWeek: entry.dayOfWeek,
    slot: entry.slot,
    subject: entry.subject,
    subjectId: entry.subjectId,
    lessonType: entry.lessonType,
    subjectRef: entry.subjectRef ? { name: entry.subjectRef.name, color: entry.subjectRef.color } : null,
    teacher: entry.teacher,
    teacherId: entry.teacherId,
    teacherRef: entry.teacherRef ? { id: entry.teacherRef.id, name: entry.teacherRef.name } : null,
    room: entry.room,
    parity: entry.parity,
    subGroup: entry.subGroup,
    status: entry.status,
    approval: entry.approval,
    note: entry.note,
  }));

  const subGroups = (
    await prisma.subGroup.findMany({
      where: { groupId: selectedGroup.id },
      select: { name: true },
      orderBy: { name: "asc" },
    })
  ).map((item) => item.name);

  const backHref = `/schedule?groupId=${encodeURIComponent(selectedGroup.id)}&week=${weekStart}`;

  return (
    <>
      <PageHeader
        eyebrow={dictionary.schBuilderEyebrow}
        title={dictionary.schBuilderTitle}
        subtitle={translate(locale, "schBuilderGroupSubtitle", {
          group: selectedGroup.name,
          range: formatWeekRange(weekStart, months),
        })}
        action={
          <ButtonLink href={backHref} variant="secondary">
            {dictionary.schBackToScheduleShort}
          </ButtonLink>
        }
      />
      <ScheduleBuilder
        key={`${selectedGroup.id}-${weekStart}`}
        role={user.role === "TEACHER" ? "TEACHER" : user.role === "REGISTRAR" ? "REGISTRAR" : "ADMIN"}
        canApprove={user.role === "ADMIN" || user.role === "REGISTRAR"}
        userId={user.id}
        userName={user.name}
        groups={groups}
        myGroupIds={myGroupIds}
        mySubjects={mySubjects}
        selectedGroupId={selectedGroup.id}
        weekStart={weekStart}
        weekParity={weekParity}
        weekNumber={isoWeekNumber(weekStart)}
        entries={entries}
        courses={courses}
        teacherOptions={Array.from(teacherSet.values()).sort((a, b) => a.name.localeCompare(b.name))}
        roomOptions={Array.from(roomSet)}
        subGroups={subGroups}
      />
    </>
  );
}
