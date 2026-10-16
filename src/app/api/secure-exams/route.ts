import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicError } from "@/components/quiz/server";
import { secureExamCreateSchema } from "@/modules/secure-exam/schemas";
import { generateUniqueExamCode } from "@/server/secure-exam";
import { recordEvent } from "@/modules/events/record";

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = secureExamCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" },
      { status: 400 },
    );
  }

  const startsAt = parseDate(parsed.data.startsAt);
  const endsAt = parseDate(parsed.data.endsAt);
  if (!startsAt || !endsAt) {
    return Response.json({ ok: false, error: "Sana noto'g'ri" }, { status: 400 });
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    return Response.json(
      { ok: false, error: "Tugash vaqti boshlanishdan keyin bo'lishi kerak" },
      { status: 400 },
    );
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: parsed.data.quizId },
      include: { course: { select: { teacherId: true, id: true } } },
    });
    if (!quiz) return Response.json({ ok: false, error: "Test topilmadi" }, { status: 404 });
    if (!quiz.isPublished) {
      return Response.json({ ok: false, error: "Test hali chop etilmagan" }, { status: 400 });
    }
    if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const code = await generateUniqueExamCode(prisma);
    const exam = await prisma.secureExam.create({
      data: {
        quizId: quiz.id,
        courseId: quiz.courseId,
        createdById: user.id,
        title: parsed.data.title,
        code,
        startsAt,
        endsAt,
        durationMin: parsed.data.durationMin,
        requireFullscreen: parsed.data.requireFullscreen,
        blockCopy: parsed.data.blockCopy,
        requireClient: parsed.data.requireClient,
        webcamEnabled: parsed.data.webcamEnabled,
        maxWarnings: parsed.data.maxWarnings,
        limitAction: parsed.data.limitAction,
        status: "SCHEDULED",
      },
    });
    await recordEvent(user.id, "secure-exam.create", {
      entity: "SecureExam",
      entityId: exam.id,
      meta: { quizId: quiz.id, courseId: quiz.courseId, code: exam.code },
    });
    return Response.json({ ok: true, data: { id: exam.id, code: exam.code } }, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
