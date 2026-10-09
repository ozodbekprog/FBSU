import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { cn } from "@/lib/utils";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import type { CourseCardData } from "@/components/courses/course-card";
import { CourseGallery } from "@/components/courses/course-gallery";
import { CourseBrowser } from "@/components/catalog/course-browser";
import type { CatalogCourse } from "@/components/catalog/catalog-course-card";

const STAT_TONES = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  gold: "bg-gold-300/20 text-gold-800 ring-gold-300/40",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
} as const;

type CourseStat = {
  label: string;
  value: number;
  tone: keyof typeof STAT_TONES;
  icon: ReactNode;
};

function StatIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export default async function CoursesPage() {
  const user = await requireUser();
  if (user.role === "OTA_ONA" || user.role === "XODIM") redirect("/dashboard");
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const where: Prisma.CourseWhereInput =
    user.role === "ADMIN"
      ? {}
      : user.role === "TEACHER"
        ? { teacherId: user.id }
        : { isPublished: true };

  const courses = await prisma.course.findMany({
    where,
    orderBy: { title: "asc" },
    include: {
      teacher: { select: { name: true } },
      sections: { select: { _count: { select: { materials: true } } } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      enrollments: { where: { userId: user.id }, select: { status: true } },
    },
  });

  const staff = user.role !== "STUDENT";

  const items: CourseCardData[] = courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    coverColor: course.coverColor,
    isPublished: course.isPublished,
    teacherName: course.teacher.name,
    materialsCount: course.sections.reduce((sum, s) => sum + s._count.materials, 0),
    studentsCount: course._count.enrollments,
  }));

  const catalogItems: CatalogCourse[] = courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    coverColor: course.coverColor,
    teacherName: course.teacher.name,
    materialsCount: course.sections.reduce((sum, s) => sum + s._count.materials, 0),
    studentsCount: course._count.enrollments,
    isEnrolled: course.enrollments.some((enrollment) => enrollment.status === "ACTIVE"),
    enrollmentStatus: course.enrollments[0]?.status ?? null,
    isElective: course.isElective,
  }));

  const subtitle =
    user.role === "ADMIN"
      ? translate(locale, "crsAllCoursesCount", { count: items.length })
      : user.role === "TEACHER"
        ? translate(locale, "crsTeachingCoursesCount", { count: items.length })
        : translate(locale, "crsAllCoursesCount", { count: items.length });

  const materialsTotal = items.reduce((sum, item) => sum + item.materialsCount, 0);
  const teachersTotal = new Set(items.map((item) => item.teacherName)).size;
  const studentsTotal = items.reduce((sum, item) => sum + item.studentsCount, 0);

  const stats: CourseStat[] = [
    {
      label: dictionary.crsCourses,
      value: items.length,
      tone: "brand",
      icon: (
        <StatIcon>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </StatIcon>
      ),
    },
    {
      label: dictionary.crsStatsMaterials,
      value: materialsTotal,
      tone: "gold",
      icon: (
        <StatIcon>
          <path d="m12 2 9 5-9 5-9-5 9-5z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </StatIcon>
      ),
    },
    user.role === "TEACHER"
      ? {
          label: dictionary.crsStudents,
          value: studentsTotal,
          tone: "emerald",
          icon: (
            <StatIcon>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </StatIcon>
          ),
        }
      : {
          label: dictionary.crsStatsTeachers,
          value: teachersTotal,
          tone: "emerald",
          icon: (
            <StatIcon>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </StatIcon>
          ),
        },
  ];

  return (
    <>
      <PageHeader
        title={dictionary.crsCourses}
        subtitle={subtitle}
        action={staff ? <ButtonLink href="/courses/new">{dictionary.crsNewCourse}</ButtonLink> : undefined}
      />

      {items.length === 0 ? (
        <EmptyState
          title={dictionary.crsCoursesNotFound}
          description={
            staff
              ? dictionary.crsNoCoursesStaff
              : dictionary.crsNoCoursesStudent
          }
          action={staff ? <ButtonLink href="/courses/new">{dictionary.crsNewCourse}</ButtonLink> : undefined}
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="relative flex items-center gap-3.5 overflow-hidden p-4 transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400" />
                <span
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
                    STAT_TONES[stat.tone],
                  )}
                >
                  {stat.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tracking-tight text-brand-950 tabular-nums">
                    {stat.value}
                  </p>
                  <p className="truncate text-xs font-medium text-slate-500">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {staff ? (
            <CourseGallery items={items} staff={staff} />
          ) : (
            <CourseBrowser items={catalogItems} staff={false} variant="catalog" searchable />
          )}
        </>
      )}
    </>
  );
}
