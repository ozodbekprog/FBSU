import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/capabilities";
import { canManageCourse } from "@/components/courses/course-access";
import { computeFinalGrades } from "@/modules/gradebook/compute";
import GradebookManager from "@/components/gradebook/GradebookManager";
import { Badge, Button, Card, CardBody, EmptyState, Label, PageHeader, Select, Table } from "@/components/ui";

function finalTone(percent: number | null) {
  if (percent === null) return "slate" as const;
  if (percent >= 90) return "green" as const;
  if (percent >= 70) return "blue" as const;
  if (percent >= 60) return "amber" as const;
  return "rose" as const;
}

export default async function GradebookPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireUser();
  if (!hasCapability(user.role, "course.grade")) redirect("/dashboard");

  const params = await searchParams;
  const requestedId = typeof params.courseId === "string" ? params.courseId.trim() : "";

  const courses = await prisma.course.findMany({
    where: user.role === "ADMIN" ? {} : { teacherId: user.id },
    orderBy: { title: "asc" },
    select: { id: true, title: true, teacherId: true },
  });

  if (courses.length === 0) {
    return (
      <>
        <PageHeader title="Baholar jurnali" subtitle="Kurslar topilmadi" />
        <EmptyState
          title="Kurslar yo'q"
          description="Sizga biriktirilgan kurslar mavjud emas. Administrator bilan bog'laning."
        />
      </>
    );
  }

  const selected = courses.find((course) => course.id === requestedId) ?? courses[0];
  if (!canManageCourse(user, selected)) redirect("/dashboard");

  const [categories, items, enrollments] = await Promise.all([
    prisma.gradeCategory.findMany({ where: { courseId: selected.id }, orderBy: { position: "asc" } }),
    prisma.gradeItem.findMany({ where: { courseId: selected.id }, orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({
      where: { courseId: selected.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const students = enrollments.map((enrollment) => ({
    id: enrollment.user.id,
    name: enrollment.user.name,
  }));

  const scores =
    items.length > 0
      ? await prisma.gradeItemScore.findMany({
          where: { itemId: { in: items.map((item) => item.id) } },
        })
      : [];

  const finals = computeFinalGrades(
    categories.map((category) => ({ id: category.id, name: category.name, weight: category.weight })),
    items.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      weight: item.weight,
      maxScore: item.maxScore,
    })),
    students.map((student) => student.id),
    scores.map((score) => ({ itemId: score.itemId, studentId: score.studentId, score: score.score })),
  );

  const finalsById = new Map(finals.map((final) => [final.studentId, final]));
  const hasStructure = categories.length > 0 || items.length > 0;

  return (
    <>
      <PageHeader
        title="Baholar jurnali"
        subtitle={`${selected.title} · ${students.length} talaba · ${items.length} ustun`}
      />

      <form action="/gradebook" method="get" className="mb-4">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-80">
              <Label>Kurs</Label>
              <Select name="courseId" defaultValue={selected.id}>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Ko&apos;rsatish
            </Button>
          </CardBody>
        </Card>
      </form>

      {!hasStructure ? (
        <EmptyState
          title="Baholar tuzilmasi kiritilmagan"
          description="Bu kursda hali kategoriya va ustunlar yo'q. Baholash tuzilmasi keyingi bosqichda admin panelda sozlanadi."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table className="max-h-[68vh] overflow-y-auto">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-5 py-3 text-left backdrop-blur">
                  Talaba
                </th>
                {categories.map((category) => (
                  <th
                    key={category.id}
                    className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-5 py-3 text-center backdrop-blur"
                  >
                    {category.name}
                    <span className="ml-1 font-normal text-slate-400">({category.weight}%)</span>
                  </th>
                ))}
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-5 py-3 text-center backdrop-blur">
                  Yakuniy
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const final = finalsById.get(student.id);
                return (
                  <tr key={student.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{student.name}</td>
                    {categories.map((category) => {
                      const value = final?.categoryPercents[category.id] ?? null;
                      return (
                        <td key={category.id} className="px-5 py-3 text-center text-sm text-slate-600">
                          {value === null ? "—" : `${value.toFixed(1)}%`}
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-center">
                      <Badge tone={finalTone(final?.percent ?? null)}>
                        {final?.percent == null ? "—" : `${final.percent.toFixed(1)}%`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <GradebookManager
        courseId={selected.id}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          weight: category.weight,
        }))}
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          categoryId: item.categoryId,
          maxScore: item.maxScore,
          weight: item.weight,
        }))}
        students={students}
        scores={scores.map((score) => ({
          itemId: score.itemId,
          studentId: score.studentId,
          score: score.score,
        }))}
      />
    </>
  );
}
