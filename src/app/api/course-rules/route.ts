import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { isEnrolled } from "@/components/quiz/server";
import { recordEvent } from "@/modules/events/record";

const targetTypeSchema = z.enum(["MATERIAL", "ASSIGNMENT", "QUIZ"]);

const targetSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().trim().min(1),
});

const upsertSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().trim().min(1),
  availableFrom: z.string().trim().min(1).nullish(),
  availableTo: z.string().trim().min(1).nullish(),
});

async function resolveCourseId(
  targetType: "MATERIAL" | "ASSIGNMENT" | "QUIZ",
  targetId: string,
): Promise<string | null> {
  if (targetType === "MATERIAL") {
    const material = await prisma.material.findUnique({
      where: { id: targetId },
      select: { section: { select: { courseId: true } } },
    });
    return material?.section.courseId ?? null;
  }
  if (targetType === "ASSIGNMENT") {
    const assignment = await prisma.assignment.findUnique({
      where: { id: targetId },
      select: { courseId: true },
    });
    return assignment?.courseId ?? null;
  }
  const quiz = await prisma.quiz.findUnique({
    where: { id: targetId },
    select: { courseId: true },
  });
  return quiz?.courseId ?? null;
}

function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const parsed = targetSchema.safeParse({
    targetType: url.searchParams.get("targetType"),
    targetId: url.searchParams.get("targetId"),
  });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  const courseId = await resolveCourseId(parsed.data.targetType, parsed.data.targetId);
  if (!courseId) {
    return Response.json({ ok: false, error: "Faoliyat topilmadi" }, { status: 404 });
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course) && !(await isEnrolled(course.id, user.id))) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rule = await prisma.activityRule.findUnique({
    where: {
      targetType_targetId: {
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      },
    },
  });

  return Response.json({ ok: true, data: { rule } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  const availableFrom = parseDate(parsed.data.availableFrom);
  const availableTo = parseDate(parsed.data.availableTo);
  if (
    (parsed.data.availableFrom != null && availableFrom === undefined) ||
    (parsed.data.availableTo != null && availableTo === undefined)
  ) {
    return Response.json({ ok: false, error: "Sana formati xato" }, { status: 400 });
  }

  if (availableFrom && availableTo && availableFrom.getTime() >= availableTo.getTime()) {
    return Response.json({ ok: false, error: "Vaqt oralig'i xato" }, { status: 400 });
  }

  const courseId = await resolveCourseId(parsed.data.targetType, parsed.data.targetId);
  if (!courseId) {
    return Response.json({ ok: false, error: "Faoliyat topilmadi" }, { status: 404 });
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rule = await prisma.activityRule.upsert({
    where: {
      targetType_targetId: {
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      },
    },
    create: {
      courseId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      availableFrom: availableFrom ?? null,
      availableTo: availableTo ?? null,
    },
    update: {
      availableFrom: availableFrom ?? null,
      availableTo: availableTo ?? null,
    },
  });

  await recordEvent(user.id, "courseRule.set", {
    entity: "ActivityRule",
    entityId: rule.id,
    meta: {
      courseId,
      targetType: rule.targetType,
      targetId: rule.targetId,
      availableFrom: rule.availableFrom ? rule.availableFrom.toISOString() : null,
      availableTo: rule.availableTo ? rule.availableTo.toISOString() : null,
    },
  });

  return Response.json({ ok: true, data: rule });
}
