import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

const createSchema = z.object({
  courseId: z.string().trim().min(1),
  categoryId: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(120),
  weight: z.number().int().min(0).optional(),
  maxScore: z.number().positive().optional(),
  source: z.enum(["MANUAL", "ASSIGNMENT", "QUIZ"]).optional(),
  refId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const categoryId = parsed.data.categoryId ?? null;
  if (categoryId) {
    const category = await prisma.gradeCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.courseId !== course.id) {
      return Response.json({ ok: false, error: "Kategoriya shu kursga tegishli emas" }, { status: 400 });
    }
  }

  const source = parsed.data.source ?? "MANUAL";
  let refId: string | null = null;
  if (source === "ASSIGNMENT") {
    const refIdValue = parsed.data.refId;
    if (!refIdValue) {
      return Response.json({ ok: false, error: "Topshiriq tanlanmagan" }, { status: 400 });
    }
    const assignment = await prisma.assignment.findFirst({ where: { id: refIdValue, courseId: course.id } });
    if (!assignment) {
      return Response.json({ ok: false, error: "Topshiriq bu kursda topilmadi" }, { status: 400 });
    }
    refId = assignment.id;
  } else if (source === "QUIZ") {
    const refIdValue = parsed.data.refId;
    if (!refIdValue) {
      return Response.json({ ok: false, error: "Test tanlanmagan" }, { status: 400 });
    }
    const quiz = await prisma.quiz.findFirst({ where: { id: refIdValue, courseId: course.id } });
    if (!quiz) {
      return Response.json({ ok: false, error: "Test bu kursda topilmadi" }, { status: 400 });
    }
    refId = quiz.id;
  }

  const created = await prisma.gradeItem.create({
    data: {
      courseId: course.id,
      categoryId,
      name: parsed.data.name,
      weight: parsed.data.weight ?? 0,
      maxScore: parsed.data.maxScore ?? 100,
      source,
      refId,
    },
  });

  await recordEvent(user.id, "gradebook.item.create", {
    entity: "GradeItem",
    entityId: created.id,
    meta: {
      courseId: course.id,
      categoryId,
      name: created.name,
      weight: created.weight,
      maxScore: created.maxScore,
      source: created.source,
      refId: created.refId,
    },
  });

  return Response.json({ ok: true, data: created }, { status: 201 });
}
