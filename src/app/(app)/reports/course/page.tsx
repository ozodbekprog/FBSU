import { redirect } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Label,
  PageHeader,
  Select,
  Stat,
} from "@/components/ui";
import { CourseActivityTable, buildCourseActivityReport } from "@/components/reports/course-report";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/capabilities";

export default async function CourseActivityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireUser();
  const canViewAnalysis = hasCapability(user.role, "analysis.view");
  const canListAll = canViewAnalysis && user.role !== "TEACHER";

  const courses = await prisma.course.findMany({
    where: canListAll
      ? {}
      : { OR: [{ teacherId: user.id }, { teacherIds: { has: user.id } }] },
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true, teacherId: true },
  });

  const { courseId } = await searchParams;
  if (courseId && !courses.some((course) => course.id === courseId)) {
    redirect("/dashboard");
  }

  const selected = courses.find((course) => course.id === courseId) ?? courses[0] ?? null;

  if (!selected) {
    if (!canViewAnalysis && courses.length === 0) redirect("/dashboard");
    return (
      <>
        <PageHeader title="Kurs faolligi hisoboti" subtitle="Talabalar faolligi" />
        <EmptyState
          title="Kurslar topilmadi"
          description="Hisobotni ko'rish uchun kamida bitta kurs kerak."
        />
      </>
    );
  }

  const report = await buildCourseActivityReport({
    id: selected.id,
    title: selected.title,
    slug: selected.slug,
  });

  return (
    <>
      <PageHeader
        title="Kurs faolligi hisoboti"
        subtitle={`${selected.title} · ${report.summary.studentCount} ta talaba`}
        action={
          <form method="get" className="flex items-end gap-2">
            <div>
              <Label htmlFor="courseId">Kurs</Label>
              <Select id="courseId" name="courseId" defaultValue={selected.id} className="w-64">
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Ko&apos;rsatish</Button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-brand-50/70">
          <Stat label="Talabalar" value={report.summary.studentCount} hint="Faol yozilganlar" />
        </div>
        <div className="rounded-2xl [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-emerald-50/70">
          <Stat
            label="O'rtacha davomat"
            value={
              report.summary.attendanceAverage !== null
                ? `${report.summary.attendanceAverage}%`
                : "—"
            }
            hint="Qatnashgan + kechikkan"
          />
        </div>
        <div className="rounded-2xl [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-purple-50/70">
          <Stat
            label="O'rtacha yakuniy"
            value={
              report.summary.finalAverage !== null ? `${report.summary.finalAverage}%` : "—"
            }
            hint="Jurnal bo'yicha"
          />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Talabalar faolligi"
          subtitle="Topshiriqlar, testlar, davomat va materiallar"
          action={
            <a
              href={`/api/reports/course/export?courseId=${selected.id}`}
              download
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              CSV yuklab olish
            </a>
          }
        />
        <CardBody>
          <CourseActivityTable report={report} />
        </CardBody>
      </Card>
    </>
  );
}
