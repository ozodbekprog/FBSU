import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/components/courses/course-access";
import { computeFinalGrades } from "@/modules/gradebook/compute";

type CsvValue = string | number | null | undefined;

function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvBody(rows: CsvValue[][]): string {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "kurs";
}

function percentCell(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toFixed(2);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) return Response.json({ ok: false, error: "courseId kerak" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const [categories, items, enrollments] = await Promise.all([
    prisma.gradeCategory.findMany({ where: { courseId }, orderBy: { position: "asc" } }),
    prisma.gradeItem.findMany({ where: { courseId }, orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({
      where: { courseId },
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
  const scoreIndex = new Map(scores.map((score) => [`${score.itemId}::${score.studentId}`, score.score]));

  const header: CsvValue[] = [
    "Talaba",
    ...categories.map((category) => `${category.name} (%)`),
    "Yakuniy (%)",
    ...items.map((item) => `${item.name} / ${item.maxScore}`),
  ];

  const rows: CsvValue[][] = students.map((student) => {
    const final = finalsById.get(student.id);
    return [
      student.name,
      ...categories.map((category) => percentCell(final?.categoryPercents[category.id] ?? null)),
      percentCell(final?.percent ?? null),
      ...items.map((item) => scoreIndex.get(`${item.id}::${student.id}`) ?? ""),
    ];
  });

  return new Response(csvBody([header, ...rows]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(course.title)}-grades.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
