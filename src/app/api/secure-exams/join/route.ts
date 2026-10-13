import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  closeExpiredAttempt,
  expiredAttemptDeadline,
  isEnrolled,
  publicError,
} from "@/components/quiz/server";
import { attendanceCounts } from "@/app/api/attendance/summary/data";
import { toQuestionFull } from "@/components/quiz/shared";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidExamCode, normalizeExamCode } from "@/modules/secure-exam/code";
import { logAudit } from "@/server/audit";

const joinSchema = z.object({
  code: z.string().trim().min(3, "Kodni kiriting").max(12),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Faqat talaba imtihonga kira oladi" }, { status: 403 });
  }

  const limit = await checkRateLimit(`join:${user.id}`, {
    windowMs: 60_000,
    maxAttempts: 12,
    keyPrefix: "secure-exam",
  });
  if (!limit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Kod noto'g'ri" },
      { status: 400 },
    );
  }

  const code = normalizeExamCode(parsed.data.code);
  if (!isValidExamCode(code)) {
    return Response.json({ ok: false, error: "Kod formati noto'g'ri" }, { status: 400 });
  }

  try {
    const exam = await prisma.secureExam.findUnique({
      where: { code },
      include: {
        quiz: {
          select: {
            id: true,
            isPublished: true,
            maxAttempts: true,
            timeLimitMin: true,
          },
        },
      },
    });
    if (!exam) {
      return Response.json({ ok: false, error: "Bunday kodli imtihon topilmadi" }, { status: 404 });
    }
    if (exam.status === "CLOSED") {
      return Response.json({ ok: false, error: "Imtihon yopilgan" }, { status: 400 });
    }
    const now = new Date();
    if (now.getTime() < exam.startsAt.getTime()) {
      return Response.json({ ok: false, error: "Imtihon hali boshlanmagan" }, { status: 400 });
    }
    if (now.getTime() > exam.endsAt.getTime()) {
      return Response.json({ ok: false, error: "Imtihon vaqti tugagan" }, { status: 400 });
    }
    if (!exam.quiz.isPublished) {
      return Response.json({ ok: false, error: "Test hali chop etilmagan" }, { status: 400 });
    }

    const existingRun = await prisma.secureExamRun.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: user.id } },
      include: { attempt: { select: { finishedAt: true } } },
    });
    if (existingRun) {
      if (existingRun.attempt.finishedAt) {
        return Response.json(
          { ok: false, error: "Siz bu imtihonni allaqachon topshirgansiz" },
          { status: 409 },
        );
      }
      return Response.json({ ok: true, data: { runId: existingRun.id, resumed: true } });
    }

    if (!(await isEnrolled(exam.courseId, user.id))) {
      return Response.json({ ok: false, error: "Kursga yozilmagansiz" }, { status: 403 });
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: { courseId: exam.courseId, studentId: user.id },
      select: { status: true },
    });
    const attendance = attendanceCounts(attendanceRecords.map((record) => record.status));
    if (!attendance.eligible) {
      return Response.json(
        { ok: false, error: "Imtihonga ruxsat yo'q (davomat past)" },
        { status: 403 },
      );
    }

    const activeAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: exam.quizId, studentId: user.id, finishedAt: null },
      include: { secureExamRun: { select: { examId: true } } },
      orderBy: { startedAt: "desc" },
    });
    if (activeAttempt?.secureExamRun && activeAttempt.secureExamRun.examId !== exam.id) {
      return Response.json(
        { ok: false, error: "Boshqa faol imtihon urinishi mavjud" },
        { status: 409 },
      );
    }

    const finishedAttempts = await prisma.quizAttempt.count({
      where: { quizId: exam.quizId, studentId: user.id, finishedAt: { not: null } },
    });
    const expired = activeAttempt
      ? expiredAttemptDeadline(activeAttempt.startedAt, exam.quiz.timeLimitMin, now)
      : null;

    const result = await prisma.$transaction(async (tx) => {
      if (exam.status === "SCHEDULED") {
        await tx.secureExam.update({ where: { id: exam.id }, data: { status: "ACTIVE" } });
      }
      if (activeAttempt && !expired) {
        return tx.secureExamRun.create({
          data: { examId: exam.id, studentId: user.id, attemptId: activeAttempt.id },
        });
      }
      if (expired && activeAttempt) {
        const questions = (
          await tx.question.findMany({
            where: { quizId: exam.quizId },
            orderBy: { position: "asc" },
          })
        ).map(toQuestionFull);
        await closeExpiredAttempt(tx, activeAttempt.id, activeAttempt.answers, questions, expired);
      }
      if (finishedAttempts >= exam.quiz.maxAttempts) return null;
      const attempt = await tx.quizAttempt.create({
        data: { quizId: exam.quizId, studentId: user.id },
      });
      return tx.secureExamRun.create({
        data: { examId: exam.id, studentId: user.id, attemptId: attempt.id },
      });
    });

    if (!result) {
      return Response.json({ ok: false, error: "Urinishlar soni tugagan" }, { status: 409 });
    }

    await logAudit({
      actorId: user.id,
      action: "secure-exam.join",
      entity: "SecureExamRun",
      entityId: result.id,
      meta: { examId: exam.id },
    });

    return Response.json(
      { ok: true, data: { runId: result.id, resumed: Boolean(activeAttempt && !expired) } },
      { status: 201 },
    );
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
