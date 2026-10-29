import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

const createSchema = z.object({
  courseId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  weight: z.number().int().min(0).max(100),
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

  const maxPosition = await prisma.gradeCategory.aggregate({
    where: { courseId: course.id },
    _max: { position: true },
  });

  const created = await prisma.gradeCategory.create({
    data: {
      courseId: course.id,
      name: parsed.data.name,
      weight: parsed.data.weight,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  await recordEvent(user.id, "gradebook.category.create", {
    entity: "GradeCategory",
    entityId: created.id,
    meta: { courseId: course.id, name: created.name, weight: created.weight },
  });

  return Response.json({ ok: true, data: created }, { status: 201 });
}
