import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { ButtonLink, PageHeader } from "@/components/ui";
import { canGradeCourse } from "@/components/courses/course-access";
import { AttendanceJournal } from "@/components/attendance/attendance-journal";
import { getAttendanceJournal } from "@/app/api/courses/[id]/attendance/journal/data";

export default async function AttendanceJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { slug } = await params;

  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) notFound();

  const management = canGradeCourse(user, course);
  if (!management) {
    if (user.role !== "STUDENT") notFound();
    const enrolled = await prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId: user.id }, status: "ACTIVE" },
    });
    if (!enrolled) notFound();
  }

  const journal = await getAttendanceJournal(course.id, management ? undefined : user.id);

  return (
    <>
      <PageHeader
        eyebrow={dictionary.crsAttendance}
        title={dictionary.crsGroupJournal}
        subtitle={translate(locale, "crsJournalSubtitle", {
          course: course.title,
          students: journal.students.length,
          lessons: journal.dates.length,
        })}
        action={
          <ButtonLink
            href={`/courses/${course.slug}/attendance`}
            variant="secondary"
            size="sm"
          >
            {dictionary.crsAttendanceSection}
          </ButtonLink>
        }
      />
      <AttendanceJournal
        courseId={course.id}
        attendanceHref={`/courses/${course.slug}/attendance`}
        students={journal.students}
        dates={journal.dates}
        records={journal.records}
        currentUserId={user.id}
        canEdit={management}
      />
    </>
  );
}
