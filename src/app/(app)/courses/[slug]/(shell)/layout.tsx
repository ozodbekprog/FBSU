import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { Avatar, Badge, ButtonLink } from "@/components/ui";
import { CourseTabs } from "@/components/forum/course-tabs";
import { getCourseAttendance } from "@/app/api/attendance/summary/data";
import {
  canGradeCourse,
  canManageCourse,
  canViewCourse,
} from "@/components/courses/course-access";

export default async function CourseShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      teacher: { select: { id: true, name: true } },
      teachers: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        include: { user: { select: { id: true, name: true } } },
      },
      sections: { select: { _count: { select: { materials: true } } } },
      enrollments: { where: { status: "ACTIVE" }, select: { userId: true } },
    },
  });

  if (!course) notFound();

  const canManage = canManageCourse(user, course);
  const canGrade = canGradeCourse(user, course);
  const isEnrolled = course.enrollments.some((entry) => entry.userId === user.id);
  if (!course.isPublished && !canViewCourse(user, course, isEnrolled)) notFound();

  const courseTeachers =
    course.teachers.length > 0
      ? course.teachers.map((teacher) => ({ id: teacher.user.id, name: teacher.user.name }))
      : [{ id: course.teacher.id, name: course.teacher.name }];

  const materialsCount = course.sections.reduce(
    (sum, section) => sum + section._count.materials,
    0,
  );
  const attendance =
    !canManage && isEnrolled ? await getCourseAttendance(course.id, user.id) : null;

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200/70 shadow-card">
        <div
          className="relative px-6 py-7 text-white md:px-8 md:py-9"
          style={{ background: `linear-gradient(125deg, ${course.coverColor} 0%, #131f3c 90%)` }}
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-20%,rgba(255,255,255,0.18),transparent_48%)]" />
          <span className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full border border-white/10" />
          <span className="pointer-events-none absolute -right-8 -top-14 size-44 rounded-full bg-white/10 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-36 left-1/4 size-80 rounded-full bg-gold-400/10 blur-3xl" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gold-400/90 via-gold-300/30 to-transparent" />
          <div className="relative">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/75 ring-1 ring-inset ring-white/15 backdrop-blur transition-colors duration-150 hover:bg-white/15 hover:text-white"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              {dictionary.crsCourses}
            </Link>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 max-w-2xl">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{course.title}</h1>
                  {!course.isPublished ? (
                    <Badge tone="gold" className="ring-1 ring-inset ring-white/25">
                      {dictionary.crsDraft}
                    </Badge>
                  ) : null}
                  {attendance && attendance.total > 0 ? (
                    <Badge tone={attendance.eligible ? "green" : "rose"} className="ring-1 ring-inset ring-white/20">
                      {translate(locale, "crsAttendanceBadge", { percent: attendance.percent })} {attendance.eligible ? "✓" : "⚠"}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 text-xs font-medium text-white/85 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {courseTeachers.map((teacher) => (
                    <span
                      key={teacher.id}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15 backdrop-blur"
                    >
                      <Avatar
                        name={teacher.name}
                        className="size-6! text-[10px] ring-1 ring-white/25"
                      />
                      {teacher.name}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15 backdrop-blur">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/70"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    {translate(locale, "crsMaterialsCount", { count: materialsCount })}
                  </span>
                  {canManage ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/15 backdrop-blur">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/70"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {translate(locale, "crsStudentsCount", { count: course.enrollments.length })}
                    </span>
                  ) : null}
                </div>
                {course.description ? (
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80">
                    {course.description}
                  </p>
                ) : null}
              </div>
              {canManage ? (
                <ButtonLink
                  href={`/courses/${course.slug}/edit`}
                  variant="gold"
                  size="sm"
                  className="shrink-0"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                  {dictionary.crsEdit}
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <CourseTabs
        slug={course.slug}
        canManage={canManage}
        canGrade={canGrade}
        isEnrolled={isEnrolled}
      />

      {children}
    </>
  );
}
