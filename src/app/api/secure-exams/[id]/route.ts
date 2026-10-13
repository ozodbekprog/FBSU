import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicError } from "@/components/quiz/server";
import { isRunOnline } from "@/modules/secure-exam/policy";
import { secureExamUpdateSchema } from "@/modules/secure-exam/schemas";
import { canManageSecureExam, finalizeRun } from "@/server/secure-exam";
import { effectiveDeadline } from "@/modules/secure-exam/policy";
import { logAudit } from "@/server/audit";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const exam = await prisma.secureExam.findUnique({
      where: { id },
      include: {
        quiz: { select: { title: true, timeLimitMin: true } },
        course: { select: { title: true, teacherId: true } },
      },
    });
    if (!exam) return Response.json({ ok: false, error: "Imtihon topilmadi" }, { status: 404 });
    if (
      !canManageSecureExam(
        { createdById: exam.createdById, courseTeacherId: exam.course.teacherId },
        user,
      )
    ) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const [runs, events] = await Promise.all([
      prisma.secureExamRun.findMany({
        where: { examId: id },
        orderBy: { startedAt: "desc" },
        include: {
          student: { select: { id: true, name: true, email: true } },
          attempt: { select: { finishedAt: true, score: true } },
        },
      }),
      prisma.secureExamEvent.findMany({
        where: { run: { examId: id } },
        orderBy: { at: "desc" },
        take: 60,
        include: { run: { select: { id: true, student: { select: { name: true } } } } },
      }),
    ]);

    const durationMin = exam.durationMin ?? exam.quiz.timeLimitMin;

    return Response.json({
      ok: true,
      data: {
        exam: {
          id: exam.id,
          quizId: exam.quizId,
          title: exam.title,
          code: exam.code,
          status: exam.status,
          quizTitle: exam.quiz.title,
          courseTitle: exam.course.title,
          startsAt: exam.startsAt.toISOString(),
          endsAt: exam.endsAt.toISOString(),
          durationMin,
          requireFullscreen: exam.requireFullscreen,
          blockCopy: exam.blockCopy,
          requireClient: exam.requireClient,
          webcamEnabled: exam.webcamEnabled,
          maxWarnings: exam.maxWarnings,
          limitAction: exam.limitAction,
        },
        runs: runs.map((run) => {
          const deadline = effectiveDeadline({
            startedAt: run.startedAt,
            durationMin,
            sittingEndsAt: exam.endsAt,
            extraMin: run.extraMin,
          });
          return {
            id: run.id,
            studentName: run.student.name,
            studentEmail: run.student.email,
            status: run.status,
            warnings: run.warnings,
            extraMin: run.extraMin,
            online: isRunOnline(run.lastSeenAt, now),
            screens: run.screens,
            fullscreen: run.fullscreen,
            webcam: run.webcam,
            startedAt: run.startedAt.toISOString(),
            finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
            lastSeenAt: run.lastSeenAt.toISOString(),
            endsAt: deadline ? deadline.toISOString() : null,
            attemptFinishedAt: run.attempt.finishedAt
              ? run.attempt.finishedAt.toISOString()
              : null,
            score: run.attempt.score,
          };
        }),
        events: events.map((event) => ({
          id: event.id,
          runId: event.run.id,
          studentName: event.run.student.name,
          type: event.type,
          severity: event.severity,
          at: event.at.toISOString(),
          meta: event.meta ?? null,
        })),
        serverNow: now.toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = secureExamUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" },
      { status: 400 },
    );
  }

  try {
    const exam = await prisma.secureExam.findUnique({
      where: { id },
      include: { course: { select: { teacherId: true } } },
    });
    if (!exam) return Response.json({ ok: false, error: "Imtihon topilmadi" }, { status: 404 });
    if (
      !canManageSecureExam(
        { createdById: exam.createdById, courseTeacherId: exam.course.teacherId },
        user,
      )
    ) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    if (parsed.data.status === "ACTIVE") {
      if (exam.status === "CLOSED") {
        return Response.json(
          { ok: false, error: "Yopilgan imtihonni qayta ochib bo'lmaydi" },
          { status: 400 },
        );
      }
      if (now.getTime() > exam.endsAt.getTime()) {
        return Response.json({ ok: false, error: "Imtihon oynasi tugagan" }, { status: 400 });
      }
      await prisma.secureExam.update({ where: { id }, data: { status: "ACTIVE" } });
    } else {
      await prisma.$transaction(async (tx) => {
        const activeRuns = await tx.secureExamRun.findMany({
          where: { examId: id, status: "ACTIVE" },
          select: { id: true },
        });
        for (const run of activeRuns) {
          await finalizeRun(tx, run.id, "SUBMITTED", now);
        }
        await tx.secureExam.update({ where: { id }, data: { status: "CLOSED" } });
      });
    }

    await logAudit({
      actorId: user.id,
      action: "secure-exam.status",
      entity: "SecureExam",
      entityId: id,
      meta: { status: parsed.data.status },
    });

    return Response.json({ ok: true, data: { status: parsed.data.status } });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const exam = await prisma.secureExam.findUnique({
      where: { id },
      include: {
        course: { select: { teacherId: true } },
        _count: { select: { runs: true } },
      },
    });
    if (!exam) return Response.json({ ok: false, error: "Imtihon topilmadi" }, { status: 404 });
    if (
      !canManageSecureExam(
        { createdById: exam.createdById, courseTeacherId: exam.course.teacherId },
        user,
      )
    ) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (exam._count.runs > 0) {
      return Response.json(
        { ok: false, error: "Ishtirokchilar bo'lgan imtihonni o'chirib bo'lmaydi" },
        { status: 409 },
      );
    }

    await prisma.secureExam.delete({ where: { id } });
    await logAudit({
      actorId: user.id,
      action: "secure-exam.delete",
      entity: "SecureExam",
      entityId: id,
    });

    return Response.json({ ok: true, data: { id } });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
