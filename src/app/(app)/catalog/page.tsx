import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { Button, ButtonLink, EmptyState, Input, PageHeader } from "@/components/ui";
import { type CatalogCourse } from "@/components/catalog/catalog-course-card";
import { CourseBrowser } from "@/components/catalog/course-browser";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const where: Prisma.CourseWhereInput = { isPublished: true };
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { teacher: { name: { contains: query, mode: "insensitive" } } },
    ];
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      teacher: { select: { name: true } },
      sections: { select: { _count: { select: { materials: true } } } },
      _count: { select: { enrollments: true } },
      enrollments: { where: { userId: user.id }, select: { id: true, status: true } },
    },
  });

  const staff = user.role !== "STUDENT";

  const items: CatalogCourse[] = courses.map((course) => ({
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
  }));

  const searchForm = (
    <form action="/catalog" method="get" className="flex w-full flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-96">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-600">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <Input
          name="q"
          defaultValue={query}
          placeholder={dictionary.crsSearchPlaceholder}
          aria-label={dictionary.crsSearchCoursesLabel}
          className="pl-9"
        />
      </div>
      <Button type="submit" variant="secondary">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        {dictionary.crsSearch}
      </Button>
      {query ? (
        <Link
          href="/catalog"
          className="text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-brand-800"
        >
          {dictionary.crsClear}
        </Link>
      ) : null}
    </form>
  );

  const empty = (
    <EmptyState
      title={query ? dictionary.crsNothingFound : dictionary.crsNoCourses}
      description={
        query
          ? translate(locale, "crsNoSearchResults", { query })
          : dictionary.crsCatalogEmpty
      }
      action={
        query ? (
          <ButtonLink href="/catalog" variant="secondary" size="sm">
            {dictionary.crsAllCourses}
          </ButtonLink>
        ) : staff ? (
          <ButtonLink href="/courses/new" size="sm">
            {dictionary.crsCreateCourse}
          </ButtonLink>
        ) : undefined
      }
    />
  );

  return (
    <>
      <PageHeader
        eyebrow={dictionary.crsCourses}
        title={dictionary.crsCatalog}
        subtitle={
          staff
            ? translate(locale, "crsPublishedCoursesCount", { count: items.length })
            : translate(locale, "crsOpenCoursesCount", { count: items.length })
        }
      />

      <CourseBrowser
        items={items}
        staff={staff}
        variant="catalog"
        search={searchForm}
        empty={empty}
      />
    </>
  );
}
