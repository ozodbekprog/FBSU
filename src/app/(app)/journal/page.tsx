import { redirect } from "next/navigation";
import { requireUser, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { SessionPanel } from "@/components/attendance/SessionPanel";
import { AttendanceJournal } from "@/components/attendance/attendance-journal";
import { JournalCourseSelect } from "@/components/attendance/journal-course-select";
import { getAttendanceJournal } from "@/app/api/courses/[id]/attendance/journal/data";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/attendance");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const { course: courseParam } = await searchParams;

  const courses = await prisma.course.findMany({
    where: user.role === "TEACHER" ? { teacherId: user.id } : {},
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true },
  });

  if (courses.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow={dictionary.schAttendanceEyebrow}
          title={dictionary.schJournalTitle}
          subtitle={dictionary.schCoursesNotFound}
        />
        <EmptyState
          title={dictionary.schNoCoursesTitle}
          description={dictionary.schNoAssignedCourses}
        />
      </>
    );
  }

  const selected = courses.find((course) => course.slug === courseParam) ?? courses[0];
  const journal = await getAttendanceJournal(selected.id);

  return (
    <>
      <PageHeader
        eyebrow={dictionary.schAttendanceEyebrow}
        title={dictionary.schJournalTitle}
        subtitle={translate(locale, "schJournalSubtitle", {
          title: selected.title,
          students: journal.students.length,
          dates: journal.dates.length,
        })}
      />
      <div className="space-y-6">
        {courses.length > 1 ? (
          <JournalCourseSelect courses={courses} value={selected.slug} />
        ) : null}
        <SessionPanel courseId={selected.id} courseTitle={selected.title} studentCount={journal.students.length} />
        <AttendanceJournal
          courseId={selected.id}
          attendanceHref={`/courses/${selected.slug}/attendance`}
          students={journal.students}
          dates={journal.dates}
          records={journal.records}
          currentUserId={user.id}
          canEdit
        />
      </div>
    </>
  );
}
